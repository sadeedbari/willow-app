import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { SettingsTabs } from "../tabs";
import { saveDailyApiKey, removeDailyApiKey } from "./actions";

export default async function TelehealthSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const staff = await getCurrentStaff();
  const canEdit = staff.role === "practice_admin";

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("practice_video_settings")
    .select("daily_api_key, updated_at")
    .eq("practice_id", staff.practiceId)
    .maybeSingle();

  // Never send the full key back to the browser -- only a masked hint.
  const maskedKey = settings ? `••••${settings.daily_api_key.slice(-4)}` : null;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-2">Telehealth video calling</p>
      </div>

      <SettingsTabs active="/settings/telehealth" />

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">{decodeURIComponent(error)}</p>
      )}
      {saved && <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">Daily.co API key saved.</p>}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-3 text-[13px] font-bold text-foreground">Daily.co video account</div>
        <p className="mb-4 text-[12.5px] text-text-2">
          Telehealth appointments automatically get a unique video call link once this practice&apos;s Daily.co
          API key is on file. Each practice uses its own Daily.co account.
        </p>

        <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13px]">
          <span className="text-text-2">Status</span>
          {settings ? (
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
                  {settings ? "Replace API key" : "Daily.co API key"}
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

            {settings && (
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
  );
}
