import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy-session";
import { STATIC_CSP_PATHS, nonceCsp } from "@/utils/csp";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isPrefetch =
    request.headers.has("next-router-prefetch") || request.headers.get("purpose") === "prefetch";
  const skipsNonceCsp =
    // Redirects have no body to protect.
    (response.status >= 300 && response.status < 400) ||
    // The webhook, cron, and internal endpoints return JSON, not pages.
    pathname.startsWith("/api/") ||
    // Prerendered pages get the static policy from next.config.ts instead.
    STATIC_CSP_PATHS.includes(pathname) ||
    isPrefetch ||
    // The service worker and other plain files.
    /\.[a-z0-9]+$/i.test(pathname);
  if (skipsNonceCsp) return response;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = nonceCsp(nonce, { analytics: pathname === "/signup" });

  // Next reads the nonce from the request's CSP header while rendering and
  // stamps it on its own scripts. Rebuilding the response from the headers
  // updateSession() already put the refreshed auth cookies into keeps this
  // render and the browser's next request in step.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const withNonce = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.getAll().forEach((cookie) => withNonce.cookies.set(cookie));
  withNonce.headers.set("Content-Security-Policy", csp);
  return withNonce;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, images, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
