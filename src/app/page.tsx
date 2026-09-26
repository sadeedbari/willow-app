{/*
IMPECCABLE DIRECTION CONTRACT
THESIS: Willow's whole pitch is that practice software can look and feel
like this page -- so the page proves it with real screenshots of the
actual product instead of illustrations or a generic feature grid.
OWN-WORLD: inherited, not invented -- the app's existing tokens (bg-surface,
text-foreground, bg-brand), its Apple system-font stack, and its
teal-blue-purple-coral gradient mark, now given room to breathe at
hero scale instead of living only in a 34px icon.
STORY: a visiting therapist sees their own week (calendar), their own day
(dashboard), getting paid (invoice), and their client's phone (portal) --
in that order -- then hits Get started.
FIRST VIEWPORT: headline + subhead + two CTAs, left-aligned on a soft
gradient-tinted ground, with the real calendar screenshot as a tilted,
shadowed proof object on the right at desktop, stacked below on mobile.
FORM: narrative/proof-led surface built directly from real product
screenshots (no external concept-seed dice available in this environment;
substituted a self-derived, reasoned structural choice per new-work.md's
own "state the assumption" guidance for a failed tool call).
FINISH: unreviewed and undocumented is unfinished; this build ends with
the finish review, the verdict, and DESIGN.md.
*/}
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://willow.sulosystems.com";

export const metadata: Metadata = {
  title: "Willow — Practice Management Software for Therapists",
  description:
    "Scheduling, telehealth, session notes, billing, secure client messaging, and a client portal — in one clean, fast app built for therapy practices in Ontario. 14-day free trial, no credit card required.",
  alternates: { canonical: "/" },
};

// Organization + SoftwareApplication structured data, combined in one
// @graph. Only properties verifiable from this codebase are included --
// no invented street address, phone number, or founding date, and
// deliberately no aggregateRating/review (there are no real reviews to
// cite, and fabricating one is a Google spam violation). Offer pricing
// mirrors the two real plans in the Pricing section below.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Sulo Systems Inc.",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.png`,
      email: "sulosystems@gmail.com",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: "Willow",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Practice management software for therapists — scheduling, telehealth, session notes, billing, secure client messaging, and a client portal.",
      provider: { "@id": `${SITE_URL}/#organization` },
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

// Deliberately renders for every visitor regardless of session state -- an
// already-logged-in staff member can still land here (a shared link, a
// bookmark, checking the public pricing page) and must be able to see it
// rather than get bounced straight to /dashboard with no way back. /login
// is the one place that redirects an existing session onward.
export default async function HomePage() {
  return (
    <div className="bg-surface">
      {/* Add JSON-LD to the page (per Next.js's app/02-guides/json-ld.md) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <BrandMark size={32} />
          <span className="text-[16px] font-bold tracking-tight text-foreground">Willow</span>
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

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(120% 100% at 15% 0%, var(--brand-tint) 0%, transparent 55%), radial-gradient(90% 90% at 100% 15%, rgba(158,143,214,0.16) 0%, transparent 60%)",
        }}
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-8 lg:pb-28 lg:pt-20">
          <div className="hero-in">
            <h1 className="text-[36px] font-bold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-[46px] lg:text-[52px]">
              Practice management software that actually feels good to use.
            </h1>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-text-2 sm:text-[17px]">
              Scheduling, telehealth, session notes, billing, and a client portal — in one clean,
              fast app built for therapy practices, whether it&apos;s just you or a small team.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-lg bg-brand px-5 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-ink"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-border bg-surface px-5 py-3 text-[14.5px] font-semibold text-text-2 transition hover:bg-surface-2 hover:text-foreground"
              >
                Log in
              </Link>
            </div>
            <p className="mt-4 text-[12.5px] text-text-3">
              From $15.90/month CAD · no setup fees · cancel anytime
            </p>
          </div>

          <div className="hero-in hero-in-delay">
            <div className="lg:rotate-[1.2deg]">
              <div className="overflow-hidden rounded-2xl border border-border shadow-[0_30px_60px_-20px_rgba(38,48,43,0.28)]">
                <Image
                  src="/marketing/calendar-shot.png"
                  alt="Willow's weekly calendar, showing a real practice's scheduled sessions"
                  width={1280}
                  height={800}
                  priority
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="block h-auto w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Positioning statement */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          <p className="text-[22px] font-bold leading-snug tracking-tight text-foreground sm:text-[26px]">
            Most practice software still feels like a filing cabinet. Willow doesn&apos;t.
          </p>
          <p className="mx-auto mt-4 max-w-[54ch] text-[15px] leading-relaxed text-text-2">
            No cluttered menus, no multi-day onboarding call, no manual for a manual&apos;s sake.
            Log in and you already know where everything is.
          </p>
        </div>
      </section>

      {/* Scheduling & telehealth */}
      <section className="border-t border-border bg-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">
                See your whole week at a glance
              </h2>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-text-2">
                Book individual, couples, family, or intake sessions in seconds. Set your weekly
                hours once, block off a vacation with a couple of clicks, and let clients book
                straight into the times you&apos;re actually free.
              </p>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-text-2">
                Every telehealth session gets its own secure video room automatically — no extra
                software to install, no links to go hunting for.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <Image
                src="/marketing/dashboard-shot.png"
                alt="A practice's daily overview in Willow — today's sessions, caseload, and revenue"
                width={1280}
                height={800}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Billing & payments */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm lg:order-2">
              <Image
                src="/marketing/invoice-shot.png"
                alt="A paid Willow invoice showing the client's balance settled online"
                width={1280}
                height={800}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="block h-auto w-full"
              />
            </div>
            <div className="lg:order-1">
              <h2 className="text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">
                Get paid without chasing anyone
              </h2>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-text-2">
                Invoices can send themselves the moment a session ends. Clients pay online by
                card, right from the invoice — the money goes straight to your own bank account.
                Willow never touches it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Client portal */}
      <section className="border-t border-border bg-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
            <div>
              <h2 className="text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">
                Give clients a portal they&apos;ll actually use
              </h2>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-text-2">
                Clients get their own simple, secure space to book appointments, message you, sign
                forms, and pay invoices — from their phone, without creating another password
                headache for you.
              </p>
            </div>
            <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[20px] border border-border shadow-sm">
              <Image
                src="/marketing/portal-shot.png"
                alt="A client booking their own appointment from Willow's client portal, on their phone"
                width={430}
                height={860}
                sizes="280px"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Messaging */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-brand-ink">
                The part clients love
              </span>
              <h2 className="mt-2 text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">
                Clients don&apos;t need a login to message you back.
              </h2>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-text-2">
                Secure messaging lives right in their client portal — but if they just hit reply on
                an email notification instead, without ever logging in anywhere, that reply lands
                in the exact same conversation automatically.
              </p>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-text-2">
                One inbox, however they respond. No second app for clients to figure out, no portal
                password for them to forget, no message ever falls through the cracks.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <Image
                src="/marketing/messages-shot.png"
                alt="A secure conversation with a client in Willow's Messages inbox"
                width={1280}
                height={800}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile */}
      <section className="border-t border-border bg-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_360px] lg:gap-16">
            <div>
              <h2 className="text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">
                Check your day without opening a laptop
              </h2>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-text-2">
                Your calendar switches to one day at a time on a phone, with a quick strip to jump
                between days — not a shrunk-down desktop grid you have to pinch and scroll to read.
                Clients, session notes, and invoices work the same way: real, readable information,
                not a table that gets cut off at the edge of the screen.
              </p>
              <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-text-2">
                Add Willow to your home screen and it opens like a real app — no browser bar, no
                digging for a bookmark, just tap the icon and you&apos;re at your dashboard.
              </p>
            </div>
            <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[20px] border border-border shadow-sm">
              <Image
                src="/marketing/mobile-calendar-shot.png"
                alt="Willow's calendar on a phone, showing one day at a time with a day-picker strip above it"
                width={390}
                height={744}
                sizes="280px"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="border-t border-border bg-surface-2">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
          <h3 className="text-[20px] font-bold tracking-tight text-foreground">
            Built for your practice, whatever size it is
          </h3>
          <p className="mx-auto mt-3 max-w-[48ch] text-[14.5px] leading-relaxed text-text-2">
            Solo today, a small team tomorrow. Invite clinicians, front-desk staff, or a billing
            admin whenever you&apos;re ready — each with exactly the access their role needs.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="text-center">
            <h2 className="text-[26px] font-bold tracking-tight text-foreground sm:text-[30px]">
              Simple pricing, either way
            </h2>
            <p className="mt-3 text-[13.5px] text-text-3">Everything is included on both plans — cancel anytime.</p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
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
              href="/login"
              className="rounded-lg border border-border bg-surface px-5 py-3 text-[14.5px] font-semibold text-text-2 transition hover:bg-surface-2 hover:text-foreground"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2.5">
            <BrandMark size={24} />
            <span className="text-[13.5px] font-bold text-foreground">Willow</span>
          </div>
          <div className="flex items-center gap-5 text-[12.5px] text-text-3">
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
      </footer>
    </div>
  );
}
