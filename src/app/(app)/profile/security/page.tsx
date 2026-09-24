import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { requestRecoveryEmailChange, changeMyPassword, resetMyMfa } from "../security-actions";
import { ProfileTabs } from "../tabs";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_HINT } from "@/utils/password";

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; recoveryEmailSent?: string; passwordChanged?: string; mfaReset?: string }>;
}) {
  const { error, recoveryEmailSent, passwordChanged, mfaReset } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("staff")
    .select("recovery_email, recovery_email_verified_at, mfa_required")
    .eq("id", staff.id)
    .single();

  if (!profile) return null;

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const mfaFactor = factorsData?.totp?.find((f) => f.status === "verified");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Practitioner Profile
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            How you appear to clients &amp; practice admin
          </p>
        </div>
      </div>

      <ProfileTabs active="/profile/security" />

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}
      {recoveryEmailSent && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Check that inbox for a confirmation link.
        </p>
      )}
      {passwordChanged && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Password changed.
        </p>
      )}
      {mfaReset && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Two-factor authentication reset — you&apos;ll set it up again the next time it&apos;s required.
        </p>
      )}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-1 text-[13px] font-bold text-foreground">Security</div>
        <p className="mb-4 text-[12.5px] text-text-2">
          {profile.mfa_required
            ? "Two-factor authentication is required for your account."
            : "Two-factor authentication is optional for your account, but still recommended."}
        </p>

        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
          <span className="text-[13.4px] text-foreground">Authenticator app</span>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                mfaFactor ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"
              }`}
            >
              {mfaFactor ? "Enabled" : "Not set up"}
            </span>
            {mfaFactor ? (
              <form action={resetMyMfa}>
                <button type="submit" className="text-[12.5px] font-semibold text-bad">
                  Disable / Reset
                </button>
              </form>
            ) : (
              <Link href="/mfa/setup" className="text-[12.5px] font-semibold text-brand-ink hover:underline">
                Set up →
              </Link>
            )}
          </div>
        </div>
        {mfaFactor && (
          <p className="mt-2 text-[11.5px] text-text-3">
            Removes your current authenticator so you can set up a new one — useful if you got a new phone or
            lost access to the old one. You&apos;ll be asked to set it up again the next time it&apos;s required.
          </p>
        )}

        <div className="mt-4 border-t border-border pt-4">
          <div className="text-[12.5px] font-semibold text-text-2">Recovery email</div>
          <p className="mt-1 text-[12px] text-text-3">
            A personal email — separate from your login — used only if you ever lose access to your
            authenticator and get locked out. Set this up now, before you need it.
          </p>

          {profile.recovery_email_verified_at ? (
            <p className="mt-3 text-[13.4px] text-foreground">
              <span className="font-semibold">{profile.recovery_email}</span>{" "}
              <span className="text-[11.5px] text-text-3">
                verified{" "}
                {new Date(profile.recovery_email_verified_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </p>
          ) : profile.recovery_email ? (
            <p className="mt-3 rounded-lg bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
              A confirmation was sent to {profile.recovery_email} — click the link in that email to
              finish setting it up.
            </p>
          ) : (
            <p className="mt-3 text-[12.5px] text-text-3">No recovery email on file yet.</p>
          )}

          <form action={requestRecoveryEmailChange} className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">
                {profile.recovery_email_verified_at ? "Change recovery email" : "Set a recovery email"}
              </label>
              <input
                name="recoveryEmail"
                type="email"
                required
                placeholder="you@personal-email.com"
                className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-border px-3.5 py-2 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2"
            >
              Send confirmation link
            </button>
          </form>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="text-[12.5px] font-semibold text-text-2">Password</div>
          <p className="mt-1 text-[12px] text-text-3">Change the password you use to log in.</p>

          <form action={changeMyPassword} className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">New password</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                pattern={PASSWORD_PATTERN}
                title={PASSWORD_REQUIREMENTS_HINT}
                autoComplete="new-password"
                className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Confirm password</label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-border px-3.5 py-2 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2"
            >
              Change password
            </button>
          </form>
          <p className="mt-1 text-[11.5px] text-text-3">{PASSWORD_REQUIREMENTS_HINT}</p>
        </div>
      </div>
    </div>
  );
}
