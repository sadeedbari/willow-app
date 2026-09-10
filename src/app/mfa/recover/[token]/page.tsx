import { BrandMark } from "@/components/brand-mark";
import { confirmMfaRecovery } from "./actions";

export default async function MfaRecoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-5 text-[26px] font-bold tracking-tight text-foreground">
            Reset two-factor authentication?
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-2">
            This removes the authenticator currently set up on your Willow account. You&apos;ll be asked
            to set up a new one the next time you log in.
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {decodeURIComponent(error)}
            </p>
          )}
          <form action={confirmMfaRecovery}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Yes, reset my authenticator
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
