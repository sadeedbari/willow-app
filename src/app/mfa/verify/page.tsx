import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { verifyMfaChallenge, sendMfaRecoveryEmail } from "./actions";
import { logout } from "@/app/(app)/actions";

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; recoverySent?: string }>;
}) {
  const { error, recoverySent } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") {
    redirect("/dashboard");
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const verifiedFactor = (factorsData?.totp ?? []).find((f) => f.status === "verified");

  if (!verifiedFactor) {
    // Nothing to challenge against -- this account needs to enroll instead.
    redirect("/mfa/setup");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-5 text-[26px] font-bold tracking-tight text-foreground">
            Enter your verification code
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-2">
            Open your authenticator app and enter the current 6-digit code.
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {decodeURIComponent(error)}
            </p>
          )}
          {recoverySent && (
            <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
              If a verified recovery email is on file, a reset link was just sent to it.
            </p>
          )}

          <form action={verifyMfaChallenge} className="space-y-4">
            <input type="hidden" name="factorId" value={verifiedFactor.id} />
            <div>
              <label htmlFor="code" className="block text-[12.5px] font-semibold text-text-2">
                6-digit code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                pattern="[0-9]{6}"
                title="Enter the 6-digit code"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-[18px] tracking-[0.3em] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Verify
            </button>
          </form>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <form action={sendMfaRecoveryEmail}>
            <button type="submit" className="text-[13px] font-semibold text-brand-ink hover:underline">
              Lost access to your authenticator?
            </button>
          </form>
          <form action={logout}>
            <button type="submit" className="text-[13px] font-semibold text-text-2 hover:text-foreground">
              Not you? Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
