import type { Metadata, Viewport } from "next";
import { MarketingAnalytics } from "@/components/marketing-analytics";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://willow.sulosystems.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Willow — Practice Management Software for Therapists",
  description:
    "Scheduling, telehealth, session notes, billing, and a client portal for therapy practices — all in one flat-priced plan.",
  openGraph: {
    siteName: "Willow",
    type: "website",
  },
  appleWebApp: {
    title: "Willow",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f9e8c",
};

// No cookies()/headers() read here on purpose -- that would opt every page
// under this layout out of static generation, including the marketing
// homepage. The theme cookie (set by theme-actions.ts's toggleTheme, an
// (app)-only preference) is instead read by an inline script that runs
// synchronously while the HTML parses, before the first paint -- the
// pattern Next's own docs recommend for exactly this "cookie read in the
// root layout blocks static prerendering" case. suppressHydrationWarning
// is required on <html> because the script sets data-theme before React
// hydrates, which would otherwise look like a mismatch.
const SET_THEME_FROM_COOKIE = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]*)/);if(m){var t=decodeURIComponent(m[1]);if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SET_THEME_FROM_COOKIE }} />
      </head>
      <body className="min-h-full flex flex-col">
        <MarketingAnalytics />
        {children}
      </body>
    </html>
  );
}
