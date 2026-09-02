import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["sharp"],
  experimental: {
    // Practice logo uploads (Settings > Practice Profile) are capped at 1 MB
    // at the application level -- this just gives multipart overhead
    // (boundaries, other form fields) room so a 1 MB file itself doesn't
    // trip Next's default 1 MB server action body limit first.
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
