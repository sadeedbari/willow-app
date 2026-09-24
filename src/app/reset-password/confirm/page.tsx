import { BrandMark } from "@/components/brand-mark";
import { confirmPasswordReset } from "./actions";

// Landing spot for the password-reset email link (via the Supabase "Reset
// Password" template, pointed here with token_hash + redirect_to instead of
// Supabase's own hosted verify link). Verification happens only when the
// button below is submitted, not on this page's own GET -- corporate email
// security scanners and link-preview bots fetch the link itself but don't
// click buttons, so they can no longer burn the single-use token before the
// real recipient does. That silent burn was the actual cause of "Link
// expired or already used" showing up on a user's very first click.
export default async function ConfirmPasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; redirect_to?: string; error?: string }>;
}) {
  const { token_hash: tokenHash, redirect_to: redirectTo, error } = await searchParams;

  if (error || !tokenHash) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <BrandMark size={56} />
          </div>
          <div className="mt-7 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
            <h1 className="text-[18px] font-bold text-foreground">Link expired or already used</h1>
            <p className="mt-2 text-[13.5px] text-text-2">
              Password reset links only work once. Please request a new one.
            </p>
            <a href="/login" className="mt-4 inline-block text-[13px] font-semibold text-brand-ink">
              ← Back to login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-5 text-[26px] font-bold tracking-tight text-foreground">
            Reset your password
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-2">
            Continue to choose a new password.
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <form action={confirmPasswordReset}>
            <input type="hidden" name="tokenHash" value={tokenHash} />
            <input type="hidden" name="destination" value={redirectTo ?? ""} />
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
