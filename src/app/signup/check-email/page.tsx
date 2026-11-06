import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center">
          <BrandMark size={56} />
        </div>
        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-[20px] font-bold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="mt-2 text-[13.5px] text-text-2">
            If this email address is new to Willow, we&apos;ve sent a confirmation link to finish creating your
            account. Once you click it, come back and log in to set up your practice.
          </p>
          {/* Deliberately doesn't say whether the address is already registered
              (that would let anyone probe for accounts) -- it covers that case
              for the person who needs it: an existing account is never sent a
              new confirmation email, so point them at login / password reset. */}
          <div className="mt-5 border-t border-border pt-4 text-left text-[12.5px] text-text-2">
            <p className="font-semibold text-foreground">Nothing arrived?</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>Give it a minute and check your spam or junk folder.</li>
              <li>
                Already signed up with this address? No new email is sent, so{" "}
                <Link href="/login" className="font-semibold text-brand-ink">
                  log in
                </Link>{" "}
                or{" "}
                <Link href="/forgot-password" className="font-semibold text-brand-ink">
                  reset your password
                </Link>
                .
              </li>
              <li>Typo in the address? Go back and sign up again with the right one.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
