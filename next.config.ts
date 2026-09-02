import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["sharp"],
  experimental: {
    // Practice logo uploads (Settings > Practice Profile) are capped at 2 MB
    // at the application level, which gives a friendly error message --
    // but that check only runs once the request body reaches the server
    // action. This limit has to sit comfortably above the largest file a
    // user might plausibly pick (e.g. an uncompressed phone photo can be
    // several MB) so oversized-but-realistic uploads still reach the
    // app-level check instead of crashing on Next's raw framework error.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
