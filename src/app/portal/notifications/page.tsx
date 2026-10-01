import { createClient } from "@/utils/supabase/server";
import { getCurrentClient } from "@/utils/supabase/current-client";
import { isThreadUnread } from "@/utils/messaging";
import { PortalTabs } from "../tabs";
import { updateMyNotificationPrefs } from "./actions";
import { PortalHeader } from "../portal-header";

export default async function PortalNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const client = await getCurrentClient();
  const supabase = await createClient();

  const [{ data: profile }, { data: thread }] = await Promise.all([
    supabase.from("clients").select("appointment_reminders_enabled").eq("id", client.id).single(),
    supabase.from("message_threads").select("client_last_read_at, updated_at").eq("client_id", client.id).maybeSingle(),
  ]);
  const unreadMessages = !!thread && isThreadUnread(thread.client_last_read_at, thread.updated_at);

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <PortalHeader practiceName={client.practiceName} practiceLogoUrl={client.practiceLogoUrl} clientFullName={client.fullName} />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <PortalTabs active="/portal/notifications" unreadMessages={unreadMessages} />

        <h1 className="mt-4 text-[18px] font-bold tracking-tight text-foreground">Notifications</h1>
        <p className="mt-1 text-[12.5px] text-text-3">Choose what your practice emails you about.</p>

        {saved && (
          <p className="mt-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
            Saved.
          </p>
        )}

        <form action={updateMyNotificationPrefs} className="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <label className="flex items-start gap-2.5 text-[13.4px] text-foreground">
            <input
              type="checkbox"
              name="appointmentRemindersEnabled"
              defaultChecked={profile?.appointment_reminders_enabled ?? true}
              className="mt-0.5"
            />
            <span>
              Email me a reminder 24 hours before my upcoming appointments
            </span>
          </label>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
