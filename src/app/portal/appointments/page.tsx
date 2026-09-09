import { createClient } from "@/utils/supabase/server";
import { getCurrentClient } from "@/utils/supabase/current-client";
import { isThreadUnread } from "@/utils/messaging";
import { PortalTabs } from "../tabs";
import { cancelMyAppointment } from "./actions";
import { portalLogout } from "../actions";

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual therapy",
  couples: "Couples therapy",
  family: "Family therapy",
  intake: "Intake session",
  group: "Group therapy",
};

type UpcomingAppointment = {
  id: string;
  starts_at: string;
  ends_at: string;
  type: string;
  location_type: string;
  status: string;
  staff_name: string;
  video_client_url: string | null;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PortalAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const { error, cancelled } = await searchParams;
  const client = await getCurrentClient();
  const supabase = await createClient();

  const [{ data: appointmentsData }, { data: thread }] = await Promise.all([
    supabase.rpc("get_my_upcoming_appointments"),
    supabase.from("message_threads").select("client_last_read_at, updated_at").eq("client_id", client.id).maybeSingle(),
  ]);
  const appointments = appointmentsData as UpcomingAppointment[] | null;
  const unreadMessages = !!thread && isThreadUnread(thread.client_last_read_at, thread.updated_at);

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3.5">
        <div>
          <div className="text-[14.5px] font-bold text-foreground">{client.practiceName}</div>
          <div className="text-[11.5px] text-text-3">Signed in as {client.fullName}</div>
        </div>
        <form action={portalLogout}>
          <button type="submit" className="text-[12.5px] font-semibold text-text-3 hover:text-foreground">
            Log out
          </button>
        </form>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <PortalTabs active="/portal/appointments" unreadMessages={unreadMessages} />

        <h1 className="mt-4 text-[18px] font-bold tracking-tight text-foreground">Appointments</h1>
        <p className="mt-1 text-[12.5px] text-text-3">Your upcoming sessions.</p>

        {error && (
          <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {decodeURIComponent(error)}
          </p>
        )}
        {cancelled && (
          <p className="mt-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
            Appointment cancelled.
          </p>
        )}

        <div className="mt-4 flex-1 space-y-3">
          {appointments?.length ? (
            appointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="text-[13.6px] font-bold text-foreground">
                  {formatDateTime(appt.starts_at)}
                </div>
                <div className="mt-1 text-[12.5px] text-text-3">
                  {TYPE_LABEL[appt.type] ?? appt.type} with {appt.staff_name} ·{" "}
                  {appt.location_type === "telehealth" ? "Video call" : "In office"}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  {appt.location_type === "telehealth" && appt.video_client_url && (
                    <a
                      href={appt.video_client_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-ink"
                    >
                      Join video call
                    </a>
                  )}
                  <form action={cancelMyAppointment}>
                    <input type="hidden" name="appointmentId" value={appt.id} />
                    <button type="submit" className="text-[12.5px] font-semibold text-bad">
                      Cancel
                    </button>
                  </form>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
              No upcoming appointments — book one from the Book Appointment tab.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
