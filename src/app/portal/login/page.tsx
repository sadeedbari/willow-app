import { portalLogin } from "./actions";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PasswordInput } from "@/components/password-input";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex justify-center">
            <BrandMark size={44} />
          </div>
          <h1 className="mt-4 text-[22px] font-bold tracking-tight text-foreground">
            Client Portal
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            Log in to book appointments, message your practice, and manage your preferences.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {decodeURIComponent(error)}
          </p>
        )}

        <form action={portalLogin} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Password
            </label>
            <PasswordInput
              name="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Log in
          </button>
        </form>

        <p className="text-center text-[12px] text-text-3">
          <Link href="/portal/forgot-password" className="font-semibold text-brand-ink">
            Forgot password?
          </Link>
        </p>

        <p className="text-center text-[12px] text-text-3">
          Your practice will send you an invitation link to set up portal access.
        </p>

        <p className="text-center text-[11.5px] text-text-3">
          <Link href="/terms" className="underline">Terms of Service</Link>{" "}·{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
