import { requestPasswordReset } from "./actions";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-5 text-[26px] font-bold tracking-tight text-foreground">
            Reset your password
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-2">
            We&apos;ll email you a link to set a new one.
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <form action={requestPasswordReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[12.5px] font-semibold text-text-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Send reset link
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-text-2">
          <Link href="/login" className="font-semibold text-brand-ink">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
