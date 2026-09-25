import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { updatePracticeSettings, removePracticeLogo } from "./actions";
import { SettingsTabs } from "./tabs";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const staff = await getCurrentStaff();
  const canEdit = staff.role === "practice_admin";

  const supabase = await createClient();
  const { data: practice } = await supabase
    .from("practices")
    .select(
      "name, business_number, primary_contact_email, primary_contact_phone, logo_url, address, appointment_reminders_enabled, reschedule_notice_hours"
    )
    .eq("id", staff.practiceId)
    .single();

  if (!practice) return null;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-2">Practice defaults</p>
      </div>

      <SettingsTabs active="/settings" />

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}
      {saved && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Settings saved.
        </p>
      )}

      {canEdit && (
        <form
          action={updatePracticeSettings}
          className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
        >
          <div className="mb-3 text-[13px] font-bold text-foreground">Practice profile</div>

          <div>
            <label className="block text-[12px] font-semibold text-text-2">Practice logo</label>
            <div className="mt-1.5 flex items-center gap-4">
              {practice.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={practice.logo_url}
                  alt="Practice logo"
                  className="h-16 w-16 flex-none rounded-lg border border-border object-contain bg-surface-2 p-1"
                />
              ) : (
                <div className="flex h-16 w-16 flex-none items-center justify-center rounded-lg border border-dashed border-border bg-surface-2 text-[10.5px] text-text-3">
                  No logo
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  name="logo"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="block w-full text-[12.5px] text-text-2 file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-text-2 hover:file:bg-surface-2"
                />
                <p className="mt-1 text-[11.5px] text-text-3">
                  PNG, JPEG, WEBP, or SVG — up to 2 MB. Shown on invoice PDFs and client-facing forms.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[12px] font-semibold text-text-2">Practice name</label>
            <input
              name="name"
              required
              defaultValue={practice.name}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="mt-3">
            <label className="block text-[12px] font-semibold text-text-2">Address</label>
            <textarea
              name="address"
              rows={3}
              defaultValue={practice.address ?? ""}
              placeholder={"123 Main St\nToronto, ON M5V 1A1"}
              className="mt-1 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-[11.5px] text-text-3">Shown on invoice PDFs, under your practice name.</p>
          </div>
          <div className="mt-3">
            <label className="block text-[12px] font-semibold text-text-2">Business number</label>
            <input
              name="businessNumber"
              defaultValue={practice.business_number ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Contact email</label>
              <input
                name="contactEmail"
                type="email"
                defaultValue={practice.primary_contact_email ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Contact phone</label>
              <input
                name="contactPhone"
                defaultValue={practice.primary_contact_phone ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-3 text-[13px] font-bold text-foreground">Notifications</div>
            <label className="flex items-center gap-2 text-[13px] text-text-2">
              <input
                type="checkbox"
                name="appointmentRemindersEnabled"
                defaultChecked={practice.appointment_reminders_enabled}
              />
              Email clients a reminder 24 hours before their appointments
            </label>
            <p className="mt-1 text-[11.5px] text-text-3">
              A client can still turn these off for themselves from their client portal.
            </p>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-3 text-[13px] font-bold text-foreground">Booking</div>
            <label className="block text-[12px] font-semibold text-text-2">
              Reschedule notice (hours)
            </label>
            <input
              name="rescheduleNoticeHours"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={practice.reschedule_notice_hours}
              className="mt-1 w-32 rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-[11.5px] text-text-3">
              Clients can reschedule their own appointments online up until this many hours before
              they start. Closer than that, they&apos;ll need to contact you directly.
            </p>
          </div>

          <button
            type="submit"
            className="mt-5 rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Save changes
          </button>
        </form>
      )}

      {canEdit && practice.logo_url && (
        <form action={removePracticeLogo} className="mt-3">
          <button type="submit" className="text-[12.5px] font-semibold text-bad">
            Remove logo
          </button>
        </form>
      )}

      {!canEdit && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-3 text-[13px] font-bold text-foreground">Practice profile</div>
          <dl className="space-y-2 text-[13.4px]">
            <div className="flex justify-between">
              <dt className="text-text-3">Practice name</dt>
              <dd className="text-foreground">{practice.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Address</dt>
              <dd className="whitespace-pre-line text-right text-foreground">{practice.address ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Contact email</dt>
              <dd className="text-foreground">{practice.primary_contact_email ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Contact phone</dt>
              <dd className="text-foreground">{practice.primary_contact_phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Appointment reminder emails</dt>
              <dd className="text-foreground">{practice.appointment_reminders_enabled ? "On" : "Off"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Reschedule notice</dt>
              <dd className="text-foreground">{practice.reschedule_notice_hours} hours</dd>
            </div>
          </dl>
          <p className="mt-4 text-[12px] text-text-3">
            Only your practice admin can edit the practice profile.
          </p>
        </div>
      )}

      <p className="mt-4 text-[12px] text-text-3">
        Per-therapist notification preferences live on your{" "}
        <a href="/profile" className="font-semibold text-brand-ink">
          Therapist Profile
        </a>
        . More practice-wide preferences (consent re-signature policy) are on the roadmap.
      </p>
    </div>
  );
}
