import { portalLogin } from "./actions";
import Link from "next/link";

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div
            className="mx-auto h-9 w-9 rounded-[10px] shadow-sm"
            style={{
              background:
                "conic-gradient(from 200deg, #4F9E8C, #6E93C9 30%, #9E8FD6 60%, #DB9179 85%, #4F9E8C)",
            }}
          />
          <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
            Client Portal
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            Log in to message your practice.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {decodeURIComponent(error)}
          </p>
        )}

        <form action={portalLogin} className="space-y-4">
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
            <input
              name="password"
              type="password"
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
      </div>
    </div>
  );
}
