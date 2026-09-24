import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { SettingsTabs } from "../tabs";
import { saveDailyApiKey, removeDailyApiKey } from "./daily-actions";
import { connectStripe, disconnectStripe } from "./stripe-actions";
import { stripe, isMissingConnectAccountError } from "@/utils/stripe/server";

export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const staff = await getCurrentStaff();
  const canEdit = staff.role === "practice_admin";

  const supabase = await createClient();
  const [{ data: videoSettings }, { data: practice }] = await Promise.all([
    supabase.from("practice_video_settings").select("daily_api_key, updated_at").eq("practice_id", staff.practiceId).maybeSingle(),
    supabase
      .from("practices")
      .select("stripe_connect_account_id, stripe_connect_details_submitted, stripe_connect_charges_enabled")
      .eq("id", staff.practiceId)
      .single(),
  ]);

  // Never send the full key back to the browser -- only a masked hint.
  const maskedKey = videoSettings ? `••••${videoSettings.daily_api_key.slice(-4)}` : null;

  // Stripe onboarding can be completed, abandoned, or left mid-way in a
  // separate browser tab -- there's no reliable client-side signal for
  // that, so refresh the connected account's status from Stripe itself
  // on every load until it reports fully chargeable.
  let chargesEnabled = practice?.stripe_connect_charges_enabled ?? false;
  let detailsSubmitted = practice?.stripe_connect_details_submitted ?? false;

  if (practice?.stripe_connect_account_id && !chargesEnabled) {
    try {
      const account = await stripe.accounts.retrieve(practice.stripe_connect_account_id);
      chargesEnabled = !!account.charges_enabled;
      detailsSubmitted = !!account.details_submitted;
      if (chargesEnabled !== practice.stripe_connect_charges_enabled || detailsSubmitted !== practice.stripe_connect_details_submitted) {
        await supabase
          .from("practices")
          .update({ stripe_connect_charges_enabled: chargesEnabled, stripe_connect_details_submitted: detailsSubmitted })
          .eq("id", staff.practiceId);
      }
    } catch (err) {
      if (isMissingConnectAccountError(err)) {
        // The id on file no longer resolves under our current Stripe key --
        // most commonly a test-mode account left over from before a
        // platform-wide live-mode migration. Forget it so the page falls
        // back to a clean "Connect Stripe" instead of a "Continue setup"
        // that would just fail the exact same way.
        await supabase
          .from("practices")
          .update({
            stripe_connect_account_id: null,
            stripe_connect_details_submitted: false,
            stripe_connect_charges_enabled: false,
          })
          .eq("id", staff.practiceId);
        practice.stripe_connect_account_id = null;
      }
      // Otherwise: Stripe unreachable -- fall back to the last-known DB
      // values rather than failing the whole page.
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-2">Connected accounts &amp; services</p>
      </div>

      <SettingsTabs active="/settings/integrations" />

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">{decodeURIComponent(error)}</p>
      )}
      {saved && <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">Daily.co API key saved.</p>}

      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-3 text-[13px] font-bold text-foreground">Stripe payments</div>
          <p className="mb-4 text-[12.5px] text-text-2">
            Connect this practice&apos;s own Stripe account so clients can pay invoices online. Payments go
            directly to this practice&apos;s Stripe balance — Willow never holds or touches the funds.
          </p>

          <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13px]">
            <span className="text-text-2">Status</span>
            {!practice?.stripe_connect_account_id ? (
              <span className="font-semibold text-text-3">Not connected</span>
            ) : chargesEnabled ? (
              <span className="font-semibold text-ok">Connected · ready to accept payments</span>
            ) : detailsSubmitted ? (
              <span className="font-semibold text-warn">Under review by Stripe</span>
            ) : (
              <span className="font-semibold text-warn">Setup started · not finished</span>
            )}
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              {!practice?.stripe_connect_account_id && (
                <form action={connectStripe}>
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
                  >
                    Connect Stripe
                  </button>
                </form>
              )}
              {practice?.stripe_connect_account_id && !chargesEnabled && (
                <form action={connectStripe}>
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
                  >
                    Continue setup
                  </button>
                </form>
              )}
              {practice?.stripe_connect_account_id && chargesEnabled && (
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-border px-4 py-2 text-[13.4px] font-semibold text-text-2 transition hover:bg-surface-2"
                >
                  Open Stripe Dashboard
                </a>
              )}
              {practice?.stripe_connect_account_id && (
                <form action={disconnectStripe}>
                  <button type="submit" className="text-[11.5px] font-semibold text-bad">
                    Disconnect Stripe
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p className="text-[12.5px] text-text-3">Only your practice admin can manage the Stripe connection.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-3 text-[13px] font-bold text-foreground">Daily.co video account</div>
          <p className="mb-4 text-[12.5px] text-text-2">
            Telehealth appointments automatically get a unique video call link once this practice&apos;s Daily.co
            API key is on file. Each practice uses its own Daily.co account.
          </p>

          <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13px]">
            <span className="text-text-2">Status</span>
            {videoSettings ? (
              <span className="font-semibold text-ok">Connected · key ending in {maskedKey}</span>
            ) : (
              <span className="font-semibold text-text-3">Not connected</span>
            )}
          </div>

          {canEdit ? (
            <>
              <form action={saveDailyApiKey} className="space-y-3">
                <div>
                  <label className="block text-[12px] font-semibold text-text-2">
                    {videoSettings ? "Replace API key" : "Daily.co API key"}
                  </label>
                  <input
                    name="apiKey"
                    type="password"
                    autoComplete="off"
                    placeholder="Paste the API key from this practice's Daily.co dashboard"
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
                >
                  Save key
                </button>
              </form>

              {videoSettings && (
                <form action={removeDailyApiKey} className="mt-3">
                  <button type="submit" className="text-[11.5px] font-semibold text-bad">
                    Disconnect Daily.co
                  </button>
                </form>
              )}
            </>
          ) : (
            <p className="text-[12.5px] text-text-3">Only your practice admin can manage the Daily.co connection.</p>
          )}
        </div>
      </div>
    </div>
  );
}
