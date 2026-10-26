import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SiteCredit } from "@/components/site-credit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://willowtherapy.ca";
const PAGE_URL = `${SITE_URL}/pricing`;

export const metadata: Metadata = {
  title: "Willow Pricing — Flat $15.90/month, No Session Caps",
  description:
    "Willow pricing: Solo $15.90/month CAD, Team $49/month CAD. No session caps or add-on fees, 14-day free trial, no card. Compare with Jane and Owl.",
  alternates: { canonical: "/pricing" },
};

// BreadcrumbList + WebPage + a page-local SoftwareApplication/Offer entity --
// Google doesn't merge JSON-LD across separate page loads, so the same
// Offer data from the homepage's @graph is repeated here rather than
// referenced. No FAQPage: the FAQ below is short and already covered by
// the homepage's FAQPage entity; duplicating that markup here would be
// redundant rather than additive.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Pricing", item: PAGE_URL },
      ],
    },
    {
      "@type": "WebPage",
      "@id": PAGE_URL,
      url: PAGE_URL,
      name: "Willow Pricing — Flat $15.90/month, No Session Caps",
      description:
        "Solo $15.90/month CAD, Team $49/month CAD — no session caps, no add-on fees, 14-day free trial with no credit card.",
      isPartOf: { "@type": "WebSite", name: "Willow", url: SITE_URL },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Willow",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: [
        {
          "@type": "Offer",
          name: "Solo",
          price: "15.90",
          priceCurrency: "CAD",
          url: `${SITE_URL}/signup`,
          description: "For a one-person practice. 1 staff account, 14-day free trial, no credit card required.",
        },
        {
          "@type": "Offer",
          name: "Team",
          price: "49",
          priceCurrency: "CAD",
          url: `${SITE_URL}/signup`,
          description:
            "For a small group practice. Up to 6 staff accounts, 14-day free trial, no credit card required.",
        },
      ],
    },
  ],
};

const INCLUDED = [
  "Scheduling & calendar",
  "Telehealth video",
  "Session notes",
  "Invoicing & online payments",
  "Client portal",
  "Secure messaging",
];

const COMPARISON = [
  { name: "Willow Solo", price: "$15.90", highlight: true },
  { name: "Jane.app Balance", price: "$54", href: "/vs/jane-app" },
  { name: "Owl Growth", price: "$60", href: "/vs/owl-practice" },
  { name: "Owl Professional", price: "$100", href: "/vs/owl-practice" },
];

// Renders for every visitor regardless of session state -- see
// src/app/page.tsx for why a marketing page must not bounce an
// already-logged-in staff member straight to /dashboard.
export default async function PricingPage() {
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
          background: "radial-gradient(120% 100% at 15% 0%, var(--brand-tint) 0%, transparent 55%)",
        }}
      >
        <div className="mx-auto max-w-4xl px-6 pb-14 pt-14 text-center lg:pb-20 lg:pt-20">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink">Pricing</span>
          <h1 className="mt-4 text-[34px] font-bold leading-[1.12] tracking-[-0.02em] text-foreground sm:text-[42px]">
            One flat price. Nothing to upgrade into.
          </h1>
          <p className="mx-auto mt-5 max-w-[56ch] text-[16px] leading-relaxed text-text-2">
            No session caps, no per-feature add-ons, no surprise plan you have to move to later.
            Scheduling, telehealth, notes, billing, and the client portal are all included from day
            one, on either plan.
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

      {/* Plans */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-7 shadow-sm">
              <div className="text-[13px] font-semibold text-text-2">Solo</div>
              <div className="mt-2 text-[38px] font-bold tracking-tight text-foreground">
                $15.90<span className="text-[15px] font-semibold text-text-2">/month CAD</span>
              </div>
              <p className="mt-1 text-[13px] text-text-3">For a one-person practice</p>
              <p className="mt-4 text-[13.5px] font-semibold text-foreground">1 staff account</p>
              <Link
                href="/signup"
                className="mt-6 block rounded-lg border border-border bg-surface px-5 py-2.5 text-center text-[13.6px] font-semibold text-text-2 transition hover:bg-surface-2 hover:text-foreground"
              >
                Get started
              </Link>
            </div>

            <div className="rounded-2xl border-2 border-brand bg-surface p-7 shadow-sm">
              <div className="text-[13px] font-semibold text-brand-ink">Team</div>
              <div className="mt-2 text-[38px] font-bold tracking-tight text-foreground">
                $49<span className="text-[15px] font-semibold text-text-2">/month CAD</span>
              </div>
              <p className="mt-1 text-[13px] text-text-3">For a small group practice</p>
              <p className="mt-4 text-[13.5px] font-semibold text-foreground">Up to 6 staff accounts</p>
              <Link
                href="/signup"
                className="mt-6 block rounded-lg bg-brand px-5 py-2.5 text-center text-[13.6px] font-semibold text-white shadow-sm transition hover:bg-brand-ink"
              >
                Get started
              </Link>
            </div>
          </div>
          <p className="mt-6 text-center text-[12.5px] text-text-3">
            Need more than 6 staff accounts? Contact us at info@sulosystems.com.
          </p>

          <div className="mx-auto mt-14 max-w-3xl">
            <h2 className="text-center text-[20px] font-bold tracking-tight text-foreground">
              Included on both plans — no add-ons, ever
            </h2>
            <ul className="mx-auto mt-6 grid max-w-xl gap-x-8 gap-y-3 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[14px] text-text-2">
                  <span className="font-bold text-ok">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-border bg-surface-2">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          <h2 className="text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">
            How it compares
          </h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-[14.5px] leading-relaxed text-text-2">
            Regular list pricing for each product&apos;s solo-practitioner plans, as of September
            2026.
          </p>
          <div className="mx-auto mt-8 max-w-md overflow-hidden rounded-2xl border border-border shadow-sm">
            {COMPARISON.map((row, i) => (
              <div
                key={row.name}
                className={`flex items-center justify-between px-5 py-4 text-left ${
                  row.highlight ? "bg-brand-tint" : "bg-surface"
                } ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div>
                  <div className={`text-[14px] font-semibold ${row.highlight ? "text-brand-ink" : "text-foreground"}`}>
                    {row.name}
                  </div>
                  {row.href && (
                    <Link href={row.href} className="text-[11.5px] text-text-3 underline hover:text-text-2">
                      See full comparison
                    </Link>
                  )}
                </div>
                <div className="text-[17px] font-bold text-foreground">
                  {row.price}
                  <span className="text-[11.5px] font-semibold text-text-3"> CAD/mo</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <h2 className="text-center text-[22px] font-bold tracking-tight text-foreground">
            Billing questions
          </h2>
          <div className="mt-8 space-y-7">
            <div>
              <h3 className="text-[15px] font-bold text-foreground">What happens after my trial?</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-text-2">
                Nothing charges automatically — no card is on file during the trial. When you&apos;re
                ready, your practice admin picks a plan and checks out; until then the trial simply
                runs its course.
              </p>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-foreground">
                Is there a limit on sessions or clients?
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-text-2">
                No. Both plans are priced per staff account, not per session or per client — book as
                many appointments as your practice actually has.
              </p>
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-foreground">
                Can I change plans or cancel later?
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-text-2">
                Yes, anytime, from your billing settings — month to month, no long-term contract. If
                you cancel, you keep access until the end of your current billing period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
          <h2 className="text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">
            Spend less time on software. More time with clients.
          </h2>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-brand px-5 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-ink"
            >
              Get started
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
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-text-3">
            <Link href="/vs/jane-app" className="transition hover:text-text-2">
              vs. Jane.app
            </Link>
            <Link href="/vs/owl-practice" className="transition hover:text-text-2">
              vs. Owl Practice
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
        <SiteCredit />
      </footer>
    </div>
  );
}
