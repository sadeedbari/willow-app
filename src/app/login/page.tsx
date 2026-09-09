import { login } from "./actions";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-5 text-[26px] font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-2">
            Log in to your Willow workspace.
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {error}
            </p>
          )}

          <form action={login} className="space-y-4">
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
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[12.5px] font-semibold text-text-2">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[12px] font-semibold text-brand-ink">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Log in
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-text-2">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-brand-ink">
            Sign up
          </Link>
        </p>

        <p className="mt-8 text-center text-[11.5px] text-text-3">
          <Link href="/terms" className="transition hover:text-text-2">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/privacy" className="transition hover:text-text-2">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
