import { signup } from "./actions";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PasswordInput } from "@/components/password-input";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_HINT } from "@/utils/password";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-5 text-[26px] font-bold tracking-tight text-foreground">
            Create your account
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-2">
            Start your Willow practice workspace.
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {error}
            </p>
          )}

          <form action={signup} className="space-y-4">
            <div>
              <label htmlFor="practiceName" className="block text-[12.5px] font-semibold text-text-2">
                Practice name
              </label>
              <input
                id="practiceName"
                name="practiceName"
                type="text"
                required
                autoComplete="organization"
                placeholder="e.g. Willow Therapy Collective"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] text-foreground outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
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
            <div>
              <label htmlFor="password" className="block text-[12.5px] font-semibold text-text-2">
                Password
              </label>
              <PasswordInput
                id="password"
                name="password"
                required
                minLength={8}
                pattern={PASSWORD_PATTERN}
                title={PASSWORD_REQUIREMENTS_HINT}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <p className="mt-1 text-[11.5px] text-text-3">{PASSWORD_REQUIREMENTS_HINT}</p>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Create account
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-text-2">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-ink">
            Log in
          </Link>
        </p>

        <p className="mt-8 text-center text-[11.5px] text-text-3">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="transition hover:text-text-2">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="transition hover:text-text-2">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
