import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://willowtherapy.ca";
const PAGE_URL = `${SITE_URL}/for/registered-psychotherapists`;
const CRPO_RECORDS_URL = "https://crpo.ca/practice-standards/record-keeping-documentation/";
const CRPO_CLINICAL_URL = "https://crpo.ca/practice-standards/record-keeping-documentation/clinical-records/";

export const metadata: Metadata = {
  title: "Software for Ontario Registered Psychotherapists | Willow",
  description:
    "Practice management for Ontario registered psychotherapists: scheduling, telehealth, notes, billing and a client portal. $15.90/mo, 14-day free trial.",
  alternates: { canonical: "/for/registered-psychotherapists" },
};

const faqs = [
  {
    q: "Is Willow built for registered psychotherapists in Ontario?",
    a: "Willow is practice management software for Ontario therapists, including registered psychotherapists (RPs). It covers scheduling, telehealth, SOAP session notes, invoicing and online payments, secure client messaging, and a client portal, and it stores health records in a Canadian database.",
  },
  {
    q: "Does using Willow make me compliant with the CRPO's standards?",
    a: "No software can do that for you. Meeting CRPO's Professional Practice Standards and PHIPA remains your responsibility as the custodian of your clients' records. Willow's features are designed to support the record-keeping practices the standards describe, but you should confirm requirements with the College.",
  },
  {
    q: "Where is my clients' information stored?",
    a: "Health records are stored in a Canadian database (AWS Canada Central), each practice's data is isolated from other practices, and Willow acts as a service provider. It never sells client data.",
  },
  {
    q: "How much does Willow cost for a solo registered psychotherapist?",
    a: "The Solo plan is $15.90 CAD per month with every feature included, no session caps and no add-on fees. There is a 14-day free trial and no credit card is required.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "For registered psychotherapists", item: PAGE_URL },
      ],
    },
    {
      "@type": "WebPage",
      "@id": PAGE_URL,
      url: PAGE_URL,
      name: "Software for Ontario Registered Psychotherapists | Willow",
      description:
        "Practice management for Ontario registered psychotherapists: scheduling, telehealth, notes, billing and a client portal. $15.90/mo, 14-day free trial.",
      isPartOf: { "@type": "WebSite", name: "Willow", url: SITE_URL },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const standardsRows = [
  {
    asks: "A client profile with identifying details and referral information",
    willow: "Client profiles with contact details, notes and documents, kept in one place.",
  },
  {
    asks: "A therapy plan and records of consent",
    willow: "Forms you send as a signing link, so a client can sign from their phone and the signed copy is on file.",
  },
  {
    asks: "Progress notes, with each entry showing who made it and when",
    willow: "SOAP session notes linked to the appointment, with a risk-assessment field and a sign-and-lock step.",
  },
  {
    asks: "Amendments that keep the original entry legible",
    willow: "Signed notes are locked. Corrections are added as addenda instead of overwriting the original.",
  },
  {
    asks: "Appointment records and financial records as part of the client file",
    willow: "Calendar history, invoices and payments tied to each client, with your registration number and service codes on invoices.",
  },
  {
    asks: "Secure storage, and PHIPA-aware handling of personal health information",
    willow: "Canadian data residency, per-practice data isolation, and secure messaging instead of plain email.",
  },
];

export default async function ForRegisteredPsychotherapistsPage() {
  return (
    <div className="bg-surface">
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
            <Link href="/pricing" className="text-[13.5px] font-semibold text-text-2 transition hover:text-foreground">
              Pricing
            </Link>
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
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink">
            For registered psychotherapists
          </span>
          <h1 className="mt-4 text-[34px] font-bold leading-[1.12] tracking-[-0.02em] text-foreground sm:text-[42px]">
            Practice management software for Ontario registered psychotherapists
          </h1>
          <p className="mx-auto mt-5 max-w-[58ch] text-[16px] leading-relaxed text-text-2">
            Run your private psychotherapy practice from one calm, fast app: scheduling, telehealth,
            SOAP notes, invoicing, secure messaging and a client portal. Built for Ontario, with
            health records kept in a Canadian database, for $15.90 a month with nothing locked behind
            a higher tier.
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
          <h2 className="text-[24px] font-bold tracking-tight text-foreground sm:text-[28px]">
            What an RP&apos;s client record needs, and where Willow fits
          </h2>
          <p className="mt-3 max-w-[62ch] text-[14.5px] leading-relaxed text-text-2">
            The College of Registered Psychotherapists of Ontario (CRPO) sets out record-keeping
            expectations in its{" "}
            <a
              href={CRPO_RECORDS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Professional Practice Standards
            </a>
            . Here is how Willow&apos;s features line up with what the standards describe.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-foreground/80">
                  <th className="w-1/2 p-4 text-[13px] font-bold text-text-2">What the standards describe</th>
                  <th className="bg-brand-tint p-4 text-[15px] font-bold text-brand-ink">In Willow</th>
                </tr>
              </thead>
              <tbody className="text-[14px]">
                {standardsRows.map((row, i) => (
                  <tr key={row.asks} className={i < standardsRows.length - 1 ? "border-b border-border" : ""}>
                    <td className="p-4 font-semibold text-foreground">{row.asks}</td>
                    <td className="bg-brand-tint p-4 text-foreground">{row.willow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface-2 p-5">
            <h3 className="text-[15px] font-bold text-foreground">How long to keep records</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-text-2">
              Under CRPO&apos;s{" "}
              <a
                href={CRPO_CLINICAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                clinical records standard
              </a>
              , a registrant who is the custodian keeps the record for at least 10 years from the last
              interaction with the client, or 10 years from the client&apos;s 18th birthday, whichever is
              later. In private practice, you are the custodian. Willow stores your records but you stay
              in control of them.
            </p>
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-text-3">
            This page is general information, not legal or regulatory advice. Standards change, so confirm
            current requirements with the CRPO. Willow is an independent product of Sulo Systems Inc. and
            is not affiliated with, sponsored by, or endorsed by the College of Registered Psychotherapists
            of Ontario. Using Willow does not by itself make a practice compliant with CRPO standards or
            PHIPA.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-surface-2">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
          <h2 className="text-[24px] font-bold tracking-tight text-foreground sm:text-[28px]">
            Built for how a psychotherapy practice actually runs
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                t: "Scheduling for every session type",
                d: "Book individual, couples, family or intake sessions, set weekly hours, and let clients book themselves. Every telehealth session gets its own video room.",
              },
              {
                t: "Notes that lock when signed",
                d: "Write SOAP notes against the appointment, record risk assessments, sign and lock, and add dated addenda if something needs correcting.",
              },
              {
                t: "Get paid without chasing",
                d: "Invoices can send automatically after a session and clients pay by card. Payments go directly to your own bank account.",
              },
              {
                t: "Messages that stay in the record",
                d: "Clients can reply to an email notification without logging in, and the reply joins the same secure conversation.",
              },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-border bg-surface p-5">
                <h3 className="text-[15px] font-bold text-foreground">{f.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-text-2">{f.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[14px] text-text-2">
            Compare Willow with other options:{" "}
            <Link href="/vs/jane-app" className="underline hover:text-foreground">
              Willow vs. Jane.app
            </Link>{" "}
            and{" "}
            <Link href="/vs/owl-practice" className="underline hover:text-foreground">
              Willow vs. Owl Practice
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">
          <h2 className="text-[24px] font-bold tracking-tight text-foreground sm:text-[28px]">
            Questions registered psychotherapists ask
          </h2>
          <dl className="mt-6 divide-y divide-border">
            {faqs.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="text-[15px] font-bold text-foreground">{f.q}</dt>
                <dd className="mt-2 text-[14px] leading-relaxed text-text-2">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-border bg-surface-2">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center sm:py-16">
          <h2 className="text-[24px] font-bold tracking-tight text-foreground sm:text-[28px]">
            Try it with your real week — no card required.
          </h2>
          <p className="mx-auto mt-3 max-w-[48ch] text-[14.5px] leading-relaxed text-text-2">
            Start a 14-day free trial, bring in a few clients, and see if it fits your practice.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-brand px-5 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-ink"
            >
              Start your free trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-lg border border-border bg-surface px-5 py-3 text-[14.5px] font-semibold text-text-2 transition hover:bg-surface-2 hover:text-foreground"
            >
              See pricing
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
          <div className="flex flex-wrap items-center justify-center gap-5 text-[12.5px] text-text-3">
            <Link href="/pricing" className="transition hover:text-text-2">
              Pricing
            </Link>
            <Link href="/vs/jane-app" className="transition hover:text-text-2">
              Willow vs. Jane.app
            </Link>
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
