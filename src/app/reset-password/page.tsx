import { createClient } from "@/utils/supabase/server";
import { updatePassword } from "./actions";
import { BrandMark } from "@/components/brand-mark";
import { RecoverySessionBridge } from "@/components/recovery-session-bridge";
import { PasswordInput } from "@/components/password-input";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_HINT } from "@/utils/password";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // No server-side session yet doesn't mean the link is bad -- Supabase's
    // recovery link hands the session back as a URL hash fragment, which
    // never reaches this server component. The bridge below reads it
    // client-side and asks us to re-render once a real session exists.
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <BrandMark size={56} />
          </div>
          <div className="mt-7">
            <RecoverySessionBridge loginHref="/login" />
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
            Set a new password
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-2">
            Choose a new password for {user.email}.
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {decodeURIComponent(error)}
            </p>
          )}

          <form action={updatePassword} className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">
                New password
              </label>
              <PasswordInput
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
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">
                Confirm password
              </label>
              <PasswordInput
                name="confirmPassword"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Set new password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
