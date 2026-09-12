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

export function MarketingAnalytics() {
  const pathname = usePathname();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId || !isMarketingPath(pathname)) {
    return null;
  }

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
