import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { BrandMark } from "@/components/brand-mark";
import { verifyMfaSetup, skipMfaSetup } from "./actions";
import { logout } from "@/app/(app)/actions";

async function clearStaleFactors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  factors: { id: string; created_at: string }[],
) {
  const STALE_AFTER_MS = 10_000;
  const now = Date.now();
  for (const f of factors) {
    if (now - new Date(f.created_at).getTime() > STALE_AFTER_MS) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }
}

export default async function MfaSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Staff-only: a client-portal login has nothing to enrol here.
  const { data: portalClientId } = await supabase.rpc("my_client_id");
  if (portalClientId) redirect("/portal");

  // listFactors()'s `.totp` array only ever contains VERIFIED factors --
  // an unverified one only shows up in `.all`. Using `.totp` here would
  // never find (or clean up) a stale unverified factor from an abandoned
  // attempt, and re-enrolling with the same friendly name then fails with
  // a name-conflict error.
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const allTotpFactors = (factorsData?.all ?? []).filter((f) => f.factor_type === "totp");

  if (allTotpFactors.some((f) => f.status === "verified")) {
    // Already enrolled -- getCurrentStaff() will route to /mfa/verify or
    // straight through, whichever this session actually needs.
    redirect("/dashboard");
  }

  // Clear out any stale unverified factor from an abandoned previous
  // attempt -- its secret was only ever shown once and can't be re-displayed,
  // so there's nothing to recover. Unverified factors can be unenrolled at
  // aal1 (only a *verified* factor requires aal2 to remove).
  //
  // Only factors older than a few seconds are removed: right after a
  // redirect (onboarding / accept-invite) this page can be rendered twice at
  // nearly the same moment, and one render must not delete the factor the
  // other one is about to show. Each enrollment also gets a unique friendly
  // name, so concurrent renders can't collide on a name conflict -- which
  // used to surface as "Couldn't start two-factor setup" on first load.
  await clearStaleFactors(supabase, allTotpFactors);

  const enroll = () =>
    supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator app ${randomUUID().slice(0, 8)}`,
    });

  let { data: enrollData, error: enrollError } = await enroll();
  if (enrollError || !enrollData) {
    // One retry covers a transient failure.
    ({ data: enrollData, error: enrollError } = await enroll());
  }

  if (enrollError || !enrollData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <BrandMark size={56} />
          <p className="mt-5 text-[13.5px] text-bad">
            Couldn&apos;t start two-factor setup. Please try again.
          </p>
          <div className="mt-5 flex items-center justify-center gap-5">
            <a href="/mfa/setup" className="text-[13px] font-semibold text-brand-ink">
              Try again
            </a>
            <form action={skipMfaSetup}>
              <button type="submit" className="text-[13px] font-semibold text-text-2 hover:text-foreground">
                Skip for now
              </button>
            </form>
            <form action={logout}>
              <button type="submit" className="text-[13px] font-semibold text-text-2 hover:text-foreground">
                Log out
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const { id: factorId, totp } = enrollData;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={56} />
          <h1 className="mt-5 text-[26px] font-bold tracking-tight text-foreground">
            Set up two-factor authentication
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text-2">
            Willow strongly recommends every staff account use an authenticator app to help keep client
            records secure. This only takes a minute.
          </p>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          {error && (
            <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {decodeURIComponent(error)}
            </p>
          )}

          <div className="text-[13.4px] text-text-2">
            <span className="font-semibold text-foreground">1. Scan this code</span> with an authenticator
            app — Google Authenticator, Authy, or 1Password all work.
          </div>
          <div className="mt-3 flex justify-center rounded-lg border border-border bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- totp.qr_code is an SVG data URI, not a static asset */}
            <img src={totp.qr_code} alt="Scan with your authenticator app" width={180} height={180} />
          </div>
          <p className="mt-2 text-center text-[11.5px] text-text-3">
            Can&apos;t scan? Enter this code manually: <span className="font-mono">{totp.secret}</span>
          </p>

          <form action={verifyMfaSetup} className="mt-5 space-y-4">
            <input type="hidden" name="factorId" value={factorId} />
            <div>
              <label htmlFor="code" className="block text-[12.5px] font-semibold text-text-2">
                2. Enter the 6-digit code from the app
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
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
              Verify &amp; continue
            </button>
          </form>
        </div>

        <div className="mt-5 flex items-center justify-center gap-5">
          <form action={skipMfaSetup}>
            <button type="submit" className="text-[13px] font-semibold text-text-2 hover:text-foreground">
              Skip for now
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
