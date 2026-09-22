import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://willow.sulosystems.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
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
        "/login",
        "/forgot-password",
        "/reset-password",
        "/accept-invite",
        "/trial-expired",
        "/verify-recovery-email",
        "/api",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
