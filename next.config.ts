import type { NextConfig } from "next";

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
};

export default nextConfig;
