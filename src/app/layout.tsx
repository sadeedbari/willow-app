import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get("theme")?.value;
  const explicitTheme = theme === "dark" || theme === "light" ? theme : undefined;

  return (
    <html lang="en" className="h-full antialiased" data-theme={explicitTheme}>
      <body className="min-h-full flex flex-col">
        <MarketingAnalytics />
        {children}
      </body>
    </html>
  );
}
