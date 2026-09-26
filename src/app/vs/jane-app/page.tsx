import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://willow.sulosystems.com";
const PAGE_URL = `${SITE_URL}/vs/jane-app`;

export const metadata: Metadata = {
  title: "Willow vs. Jane.app — Pricing & Feature Comparison for Ontario Therapists",
  description:
    "A side-by-side look at Willow and Jane.app's Balance plan: pricing, session limits, telehealth, and what's actually included. Sourced from Jane's own published pricing.",
};

// BreadcrumbList + WebPage structured data for this comparison page. No
// FAQPage: this page has no visible Q&A content, just a pricing/feature
// table, so FAQPage schema would misrepresent the page.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Willow vs. Jane.app", item: PAGE_URL },
      ],
    },
    {
      "@type": "WebPage",
      "@id": PAGE_URL,
      url: PAGE_URL,
      name: "Willow vs. Jane.app — Pricing & Feature Comparison for Ontario Therapists",
      description:
        "A side-by-side look at Willow and Jane.app's Balance plan: pricing, session limits, telehealth, and what's actually included. Sourced from Jane's own published pricing.",
      isPartOf: { "@type": "WebSite", name: "Willow", url: SITE_URL },
    },
  ],
};

// Renders for every visitor regardless of session state -- see
// src/app/page.tsx for why a marketing page must not bounce an
// already-logged-in staff member straight to /dashboard.
export default async function WillowVsJaneAppPage() {
  return (
    <div className="bg-surface">
      {/* Add JSON-LD to the page (per Next.js's app/02-guides/json-ld.md) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size={32} />
            <span className="text-[16px] font-bold tracking-tight text-foreground">Willow</span>
          </Link>
          <nav className="ml-auto flex items-center gap-5">
            <Link href="/login" className="text-[13.5px] font-semibold text-text-2 transition hover:text-foreground">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 100% at 15% 0%, var(--brand-tint) 0%, transparent 55%)",
        }}
      >
        <div className="mx-auto max-w-4xl px-6 pb-14 pt-14 text-center lg:pb-20 lg:pt-20">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink">
            Willow vs. Jane.app
          </span>
          <h1 className="mt-4 text-[34px] font-bold leading-[1.12] tracking-[-0.02em] text-foreground sm:text-[42px]">
            What Jane&apos;s Balance plan charges extra for, Willow just includes — for less.
          </h1>
          <p className="mx-auto mt-5 max-w-[56ch] text-[16px] leading-relaxed text-text-2">
            Both are built for solo practitioners. The difference shows up in the session cap, and in what you
            have to upgrade to unlock. Numbers below are pulled directly from Jane&apos;s own published pricing.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-brand px-5 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-ink"
            >
              Start your 14-day free trial
            </Link>
            <span className="text-[12.5px] text-text-3">No credit card required</span>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
          <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-foreground/80">
                  <th className="w-[30%] p-4 text-[13px] font-bold text-text-2"></th>
                  <th className="bg-brand-tint p-4">
                    <div className="text-[15px] font-bold text-brand-ink">Willow Solo</div>
                    <div className="text-[11.5px] font-medium text-text-3">everything included</div>
                  </th>
                  <th className="p-4">
                    <div className="text-[15px] font-bold text-foreground">Jane.app</div>
                    <div className="text-[11.5px] font-medium text-text-3">Balance plan</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold text-foreground">Monthly price</td>
                  <td className="bg-brand-tint p-4">
                    <span className="text-[19px] font-bold text-foreground">$15.90</span>{" "}
                    <span className="text-[12px] text-text-3">CAD/mo</span>
                  </td>
                  <td className="p-4">
                    <span className="text-[19px] font-bold text-foreground">$54</span>{" "}
                    <span className="text-[12px] text-text-3">CAD/mo</span>
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold text-foreground">Sessions per month</td>
                  <td className="bg-brand-tint p-4 text-foreground">Up to 90</td>
                  <td className="p-4 text-foreground">
                    20{" "}
                    <span className="block text-[11.5px] text-text-3">
                      Unlimited needs the $79/mo Practice plan
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold text-foreground">Telehealth video</td>
                  <td className="bg-brand-tint p-4">
                    <span className="font-bold text-ok">✓ Included</span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-ok">✓ Included</span>{" "}
                    <span className="block text-[11.5px] text-text-3">1:1 only — group calls +$15/mo</span>
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold text-foreground">Client portal &amp; secure messaging</td>
                  <td className="bg-brand-tint p-4">
                    <span className="font-bold text-ok">✓ Included</span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-ok">✓ Included</span>
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 font-semibold text-foreground">AI note-assist</td>
                  <td className="bg-brand-tint p-4">
                    <span className="font-bold text-bad">✗ Not built yet</span>
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-ok">✓ 5 free notes/mo</span>{" "}
                    <span className="block text-[11.5px] text-text-3">Unlimited is +$15/mo</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-foreground">Insurance billing</td>
                  <td className="bg-brand-tint p-4 text-foreground">
                    Client-facing superbill included
                    <span className="block text-[11.5px] text-text-3">Client self-submits for reimbursement</span>
                  </td>
                  <td className="p-4 text-foreground">
                    +$20/mo add-on
                    <span className="block text-[11.5px] text-text-3">Plus per-practitioner fee</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-text-3">
            Comparison reflects Jane.app&apos;s publicly listed Balance plan pricing at{" "}
            <span className="whitespace-nowrap">jane.app/pricing</span> as of September 2026. Jane is a strong,
            established product — this page compares the entry tier most solo practitioners actually
            evaluate, since that&apos;s the fairest apples-to-apples comparison at Willow&apos;s price point.
            Pricing and features are set by Jane Software Inc. and are subject to change — confirm current
            details directly with them before switching. Willow is an independent product of Sulo Systems
            Inc. and is not affiliated with, sponsored by, or endorsed by Jane Software Inc.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-surface-2">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center sm:py-16">
          <h2 className="text-[24px] font-bold tracking-tight text-foreground sm:text-[28px]">
            See it yourself — no card required.
          </h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-[14.5px] leading-relaxed text-text-2">
            Start a 14-day free trial and bring your real week into Willow before deciding anything.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-brand px-5 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-ink"
            >
              Start your free trial
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-border bg-surface px-5 py-3 text-[14.5px] font-semibold text-text-2 transition hover:bg-surface-2 hover:text-foreground"
            >
              See all of Willow
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2.5">
            <BrandMark size={24} />
            <span className="text-[13.5px] font-bold text-foreground">Willow</span>
          </div>
          <div className="flex items-center gap-5 text-[12.5px] text-text-3">
            <Link href="/vs/owl-practice" className="transition hover:text-text-2">
              Willow vs. Owl Practice
            </Link>
            <Link href="/terms" className="transition hover:text-text-2">
              Terms of Service
            </Link>
            <Link href="/privacy" className="transition hover:text-text-2">
              Privacy Policy
            </Link>
            <span>© {new Date().getFullYear()} Sulo Systems Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
