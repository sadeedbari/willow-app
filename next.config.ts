import type { NextConfig } from "next";
import { STATIC_CSP, STATIC_CSP_PATHS } from "./src/utils/csp";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["sharp"],
  experimental: {
    // The largest per-feature upload cap in the app is 10 MB (client
    // documents; the practice logo is capped at 2 MB) -- both are enforced
    // with a friendly error message at the application level, but that
    // check only runs once the request body reaches the server action.
    // This limit has to sit comfortably above the largest file a user
    // might plausibly pick so oversized-but-realistic uploads still reach
    // the app-level check instead of crashing on Next's raw framework
    // error ("Body exceeded Nmb limit").
    serverActions: {
      bodySizeLimit: "20mb",
    },
    // This app's middleware (proxy.ts, which runs on every request) has its
    // own separate 10 MB default body-read limit -- unrelated to
    // serverActions.bodySizeLimit above -- that a large file upload also
    // has to clear before the request even reaches the server action.
    middlewareClientMaxBodySize: "20mb",
  },
  // Beyond Vercel's platform-default HSTS, the app was sending no security
  // headers at all -- notably no clickjacking protection, despite /login,
  // /pay/[token], and /consent/[token] all handling auth or PHI-adjacent
  // data. Telehealth video (Daily.co) always opens in a new tab, never an
  // iframe on this origin (see the "Join video call" links in the calendar
  // and portal), so a restrictive Permissions-Policy here doesn't affect it.
  // The Content-Security-Policy for server-rendered pages is set per request
  // in proxy.ts (it needs a fresh nonce); the prerendered marketing pages
  // can't have one, so they get the static policy here instead.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      ...STATIC_CSP_PATHS.map((source) => ({
        source,
        headers: [{ key: "Content-Security-Policy", value: STATIC_CSP }],
      })),
    ];
  },
};

export default nextConfig;
