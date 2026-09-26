import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/webhooks/*, /api/cron/*, and /api/internal/* authenticate themselves
// (a webhook signature or a shared secret), never via a Supabase session --
// the caller is a third-party service, Postgres, or another one of Willow's
// own backend processes (e.g. the stripe-webhook Edge Function), not a
// browser.
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth",
  "/consent",
  "/pay",
  "/book",
  "/vs",
  "/terms",
  "/privacy",
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/forgot-password",
  "/reset-password",
  "/portal/login",
  "/portal/accept-invite",
  "/portal/forgot-password",
  "/portal/reset-password",
  "/api/webhooks",
  "/api/cron",
  "/api/internal",
];

// The actual app surface that requires a signed-in session -- anything that
// falls under neither this list nor PUBLIC_PATHS above (a typo, a dead
// backlink, a deleted page) now falls through untouched to Next's own
// routing instead of soft-redirecting to /login. Every one of these routes
// also re-checks auth itself (getCurrentStaff()/getCurrentClient() both
// redirect on their own if there's no session) -- this list is just about
// not soft-404ing genuinely unmatched paths, not the only auth gate.
const PROTECTED_PATHS = [
  "/dashboard",
  "/calendar",
  "/clients",
  "/notes",
  "/invoices",
  "/messages",
  "/settings",
  "/booking-requests",
  "/notifications",
  "/practice-overview",
  "/search",
  "/help",
  "/forms",
  "/profile",
  "/portal",
  "/onboarding",
  "/mfa",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and
  // supabase.auth.getUser() — it can randomly log users out because it
  // interferes with token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // "/" (the marketing landing page) is an exact match, not a startsWith
  // prefix -- every path starts with "/", so treating it as a prefix would
  // make the entire app public.
  const isPublicPath =
    request.nextUrl.pathname === "/" ||
    PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  const isProtectedPath = PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.startsWith("/portal") ? "/portal/login" : "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: the supabaseResponse object must be returned as-is. Creating
  // a new response here drops the refreshed auth cookies, breaking sessions.
  return supabaseResponse;
}
