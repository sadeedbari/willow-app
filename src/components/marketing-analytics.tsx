"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

// Only the public marketing funnel -- landing page, comparison pages, and
// signup -- gets a third-party analytics script. Deliberately excluded:
// every authenticated app/portal page and clinical-adjacent routes
// (consent, pay, book), so no session on those pages ever reaches Google
// Analytics, even indirectly via a page path.
const MARKETING_PATHS = ["/", "/vs", "/signup"];

function isMarketingPath(pathname: string): boolean {
  return MARKETING_PATHS.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Initialized from onReady rather than an inline <Script>: the strict CSP on
// server-rendered pages (/signup) only runs inline script that carries a
// per-request nonce.
export function MarketingAnalytics() {
  const pathname = usePathname();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId || !isMarketingPath(pathname)) {
    return null;
  }

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
      onReady={() => {
        window.dataLayer = window.dataLayer || [];
        // gtag.js only recognizes commands pushed as an `arguments` object,
        // not an array, so this can't use rest parameters.
        window.gtag =
          window.gtag ||
          function () {
            // eslint-disable-next-line prefer-rest-params
            window.dataLayer.push(arguments);
          };
        window.gtag("js", new Date());
        window.gtag("config", measurementId);
      }}
    />
  );
}
