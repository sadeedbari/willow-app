import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MarketingAnalytics } from "@/components/marketing-analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "Willow",
  description: "Practice management for therapists.",
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
