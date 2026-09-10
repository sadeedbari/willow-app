import Link from "next/link";

const EFFECTIVE_DATE = "September 10, 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface-2 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-10">
        <h1 className="text-[24px] font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mt-1 text-[13px] text-text-3">Effective {EFFECTIVE_DATE}</p>

        <div className="mt-8 space-y-7 text-[13.8px] leading-relaxed text-text-2">
          <p>
            This Privacy Policy explains how Sulo Systems Inc. (&quot;Sulo Systems,&quot;
            &quot;we,&quot; &quot;us&quot;) handles information in connection with Willow, our
            practice-management platform for psychotherapists (the &quot;Service&quot;).
          </p>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">1. A note on client health information</h2>
            <p className="mt-2">
              Willow is used by therapy Practices to store information about their Clients, which may
              include clinical/session notes and other sensitive health information. For that data,
              the Practice is the data controller — it decides what&apos;s collected and why, and is
              responsible for its own obligations under applicable health-privacy and
              professional-conduct laws (for example, Ontario&apos;s Personal Health Information
              Protection Act or an equivalent law in another jurisdiction). Sulo Systems acts as a
              service provider/processor on the Practice&apos;s behalf: we store and transmit this
              data to operate the Service, and we don&apos;t access, use, or share it except as
              needed to provide, secure, or support the Service, or as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">2. Information we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="font-semibold text-foreground">Account information:</span> name,
                email, and role, for Practice staff and for Clients who use the client portal.
              </li>
              <li>
                <span className="font-semibold text-foreground">Practice data:</span> client records,
                appointments, session/clinical notes, forms, messages, and invoices, entered by a
                Practice or its Clients.
              </li>
              <li>
                <span className="font-semibold text-foreground">Payment information:</span> handled
                directly by our payment processor, Stripe — Sulo Systems does not receive or store
                full card numbers.
              </li>
              <li>
                <span className="font-semibold text-foreground">Usage information:</span> basic
                technical data (like log-in timestamps and error logs) used to operate and secure the
                Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">3. How we use information</h2>
            <p className="mt-2">
              We use information to provide the Service (scheduling, messaging, forms, invoicing,
              video calls), to communicate with users about their account, to process payments, to
              maintain security and prevent abuse, and to comply with legal obligations. We do not
              sell personal information, and we do not use client health data for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">4. Who we share information with</h2>
            <p className="mt-2">
              We share information with service providers who help us run Willow, under
              confidentiality obligations, including: Supabase (database and authentication),
              Vercel (hosting), Stripe (subscription billing, and — for a Practice that connects its
              own Stripe account — Client invoice payments made directly to that Practice), Resend
              (transactional email), and Daily.co (video calls for telehealth appointments, for
              Practices that use that feature). We may also disclose information if required by law
              or to protect the rights, safety, or property of Sulo Systems or others.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">5. Cross-border data storage</h2>
            <p className="mt-2">
              Some of the service providers listed in Section 4 store or process information outside
              Canada. Specifically:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="font-semibold text-foreground">Supabase</span> (database and
                authentication): hosted in Canada.
              </li>
              <li>
                <span className="font-semibold text-foreground">Vercel</span> (hosting): primarily the
                United States.
              </li>
              <li>
                <span className="font-semibold text-foreground">Stripe</span> (payments): the United
                States, with international sub-processors as needed to provide the service.
              </li>
              <li>
                <span className="font-semibold text-foreground">Resend</span> (transactional email):
                the United States.
              </li>
              <li>
                <span className="font-semibold text-foreground">Daily.co</span> (video calls): global
                infrastructure operated on Amazon Web Services, not limited to a single country.
              </li>
            </ul>
            <p className="mt-2">
              This means personal information submitted to Willow — including personal health
              information a Practice stores about its Clients — may be accessed, processed, or stored
              outside Canada, where it is subject to the laws of that jurisdiction, including
              potential access by that jurisdiction&apos;s courts, law enforcement, or national
              security authorities under rules that may differ from Canadian law. We select service
              providers that maintain industry-standard safeguards for cross-border transfers, such as
              Standard Contractual Clauses or participation in the EU-U.S. Data Privacy Framework,
              where applicable.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">6. Data security</h2>
            <p className="mt-2">
              We use industry-standard measures to protect information, including encryption in
              transit, access controls, and database-level isolation between Practices. No system is
              perfectly secure, and we can&apos;t guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">7. Data breach notification</h2>
            <p className="mt-2">
              If we become aware of a security incident affecting a Practice&apos;s data, we&apos;ll
              notify the affected Practice without undue delay, including what we know about the
              incident and what we&apos;re doing about it, so the Practice can meet its own
              notification obligations as the health information custodian — including, where
              applicable, notifying its Clients and the Information and Privacy Commissioner of
              Ontario.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">8. Data retention</h2>
            <p className="mt-2">
              We retain Practice and Client data for as long as the Practice&apos;s account is active,
              plus a reasonable period afterward, unless a Practice requests earlier deletion or
              longer retention is required by law or professional record-keeping obligations.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">9. Your choices</h2>
            <p className="mt-2">
              Practice staff can access and update their account information directly in Willow.
              Clients with portal access can do the same for their own portal account. To request
              access to, correction of, or deletion of personal information, contact your Practice
              directly (as the data controller for your health information) or reach us at the email
              below.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">10. Changes to this policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. If we make material changes,
              we&apos;ll provide reasonable notice (for example, by email or an in-app notice) before
              they take effect.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">11. Contact</h2>
            <p className="mt-2">
              Questions about this policy? Reach us at{" "}
              <a href="mailto:sulosystems@gmail.com" className="font-semibold text-brand-ink underline">
                sulosystems@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-10 text-[12px] text-text-3">
          See also our <Link href="/terms" className="font-semibold underline">Terms of Service</Link>.
        </p>
      </div>
    </div>
  );
}
