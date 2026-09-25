import Link from "next/link";

const EFFECTIVE_DATE = "September 25, 2026";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-surface-2 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-10">
        <h1 className="text-[24px] font-bold tracking-tight text-foreground">Terms of Service</h1>
        <p className="mt-1 text-[13px] text-text-3">Effective {EFFECTIVE_DATE}</p>

        <div className="mt-8 space-y-7 text-[13.8px] leading-relaxed text-text-2">
          <p>
            Willow is a practice-management platform for psychotherapists, provided by Sulo Systems
            Inc. (&quot;Sulo Systems,&quot; &quot;we,&quot; &quot;us&quot;). These Terms of Service
            (&quot;Terms&quot;) govern your access to and use of Willow (the &quot;Service&quot;). By
            creating an account or using the Service, you agree to these Terms.
          </p>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">1. Who these Terms apply to</h2>
            <p className="mt-2">
              A &quot;Practice&quot; is a therapy practice, clinician, or other organization that
              signs up for Willow. Practice staff (&quot;Practitioners&quot;) act on behalf of their
              Practice. Clients of a Practice may also use Willow&apos;s client portal to book
              appointments, message their practitioner, sign forms, and pay invoices. These Terms
              apply to Practices, Practitioners, and Clients alike, except where a section says
              otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">2. The Practice is responsible for its data</h2>
            <p className="mt-2">
              Each Practice is solely responsible for the accuracy, legality, and appropriateness of
              the client information, clinical notes, and other content it stores in Willow, and for
              its own compliance with the professional, regulatory, and privacy obligations that
              apply to it (including any applicable health-information-privacy law). Sulo Systems
              provides the software; it does not provide clinical, legal, or regulatory advice, and
              is not a party to the therapeutic relationship between a Practice and its Clients.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">3. Accounts &amp; acceptable use</h2>
            <p className="mt-2">
              You&apos;re responsible for keeping your login credentials confidential and for all
              activity under your account. You agree not to use the Service to violate any law,
              infringe anyone&apos;s rights, upload malicious code, or attempt to access data that
              doesn&apos;t belong to you or your Practice.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">4. Subscriptions &amp; payment</h2>
            <p className="mt-2">
              Practices subscribe to Willow on a recurring basis at the price shown at checkout,
              billed through our payment processor, Stripe. Subscriptions renew automatically until
              cancelled; you can cancel at any time from Settings, and access continues through the
              end of the paid period. Fees are non-refundable except where required by law.
            </p>
            <p className="mt-2">
              Willow can optionally let a Practice connect its own Stripe account so its Clients can
              pay invoices online. Those payments go directly to the Practice&apos;s own Stripe
              account — Sulo Systems does not hold, control, or take a share of Client payments made
              this way, and is not responsible for a Practice&apos;s billing arrangements with its own
              Clients.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">5. Scheduling, cancellation &amp; rescheduling</h2>
            <p className="mt-2">
              Appointments booked through Willow are between a Client and their Practice, and are
              subject to that Practice&apos;s own scheduling and cancellation policies. A Practice
              can set how many hours&apos; notice a Client needs to cancel or reschedule an
              appointment online through the client portal (24 hours by default); within that
              window, self-service cancellation and rescheduling are unavailable online, and the
              Client must contact the Practice directly. This limit applies only to a Client&apos;s
              own self-service actions — a Practice&apos;s staff can always cancel or reschedule any
              appointment. Sulo Systems does not set, enforce, or collect any cancellation or
              late-notice fees; any such fee is a matter between the Practice and its Client, under
              the Practice&apos;s own policies.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">6. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate access to the Service for a Practice that breaches these
              Terms, doesn&apos;t pay its subscription, or uses the Service in a way that puts other
              users or Sulo Systems at risk. A Practice may stop using the Service at any time by
              cancelling its subscription.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">7. Disclaimers &amp; limitation of liability</h2>
            <p className="mt-2">
              The Service is provided &quot;as is,&quot; without warranties of any kind. To the
              maximum extent permitted by law, Sulo Systems will not be liable for indirect,
              incidental, or consequential damages, or for any amount exceeding the fees paid for the
              Service in the twelve months before the claim arose.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">8. Changes to these Terms</h2>
            <p className="mt-2">
              We may update these Terms from time to time. If we make material changes, we&apos;ll
              provide reasonable notice (for example, by email or an in-app notice) before they take
              effect.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">9. Governing law</h2>
            <p className="mt-2">
              These Terms are governed by the laws of the Province of Ontario and the federal laws of
              Canada applicable therein, without regard to conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-foreground">10. Contact</h2>
            <p className="mt-2">
              Questions about these Terms? Reach us at{" "}
              <a href="mailto:sulosystems@gmail.com" className="font-semibold text-brand-ink underline">
                sulosystems@gmail.com
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-10 text-[12px] text-text-3">
          See also our <Link href="/privacy" className="font-semibold underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
