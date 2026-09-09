import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/webhooks/* and /api/cron/* authenticate themselves (a webhook
// signature or a shared secret), never via a Supabase session -- the caller
// is a third-party service or Postgres itself, not a browser.
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth",
  "/consent",
  "/pay",
  "/book",
  "/terms",
  "/privacy",
  "/forgot-password",
  "/reset-password",
  "/portal/login",
  "/portal/accept-invite",
  "/portal/forgot-password",
  "/portal/reset-password",
  "/api/webhooks",
  "/api/cron",
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

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.startsWith("/portal") ? "/portal/login" : "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: the supabaseResponse object must be returned as-is. Creating
  // a new response here drops the refreshed auth cookies, breaking sessions.
  return supabaseResponse;
}
