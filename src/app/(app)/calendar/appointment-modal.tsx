import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { rescheduleAppointment, setAppointmentStatus, updateAutoSendInvoice } from "./[id]/actions";

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  couples: "Couples",
  family: "Family",
  intake: "Intake",
  group: "Group",
};

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-hue-cal-tint text-hue-cal",
  completed: "bg-ok-tint text-ok",
  cancelled: "bg-bad-tint text-bad",
  no_show: "bg-warn-tint text-warn",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export async function AppointmentModal({
  appointmentId,
  closeHref,
  error,
}: {
  appointmentId: string;
  closeHref: string;
  error?: string;
}) {
  const supabase = await createClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, type, location_type, status, client_id, video_practitioner_url, auto_send_invoice, clients(full_name), staff(full_name)"
    )
    .eq("id", appointmentId)
    .single();

  if (!appt) return null;

  const { data: existingNote } = await supabase
    .from("session_notes")
    .select("id, status")
    .eq("appointment_id", appointmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const client = appt.clients as unknown as { full_name: string } | null;
  const clinician = appt.staff as unknown as { full_name: string } | null;
  const start = new Date(appt.starts_at);
  const end = new Date(appt.ends_at);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  // Reschedule/no-show/cancel are always available, regardless of whether the
  // appointment is in the past, present, or future -- completion itself is
  // handled automatically (see the auto-complete-past-appointments cron job).
  // Actions (reschedule, status change) should reopen this same modal with
  // the updated data -- only the close button/backdrop should fully close it.
  const returnTo = `${closeHref}&event=${appt.id}`;

  return (
    <>
      <Link
        href={closeHref}
        aria-label="Close"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg">
          {error && (
            <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {decodeURIComponent(error)}
            </p>
          )}

          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[19px] font-bold tracking-tight text-foreground">
                {client?.full_name ?? "Unknown client"}
              </h2>
              <p className="mt-1 text-[13.5px] text-text-2">
                {start.toLocaleString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                · {durationMinutes} min
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLE[appt.status]}`}
              >
                {STATUS_LABEL[appt.status]}
              </span>
              <Link
                href={closeHref}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-text-2 transition hover:bg-surface-3 hover:text-foreground"
              >
                ×
              </Link>
            </div>
          </div>

          {appt.location_type === "telehealth" && (
            appt.video_practitioner_url ? (
              <a
                href={appt.video_practitioner_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10l5-3v10l-5-3" />
                  <rect x="3" y="6" width="12" height="12" rx="2" />
                </svg>
                Join Video Call
              </a>
            ) : (
              <button
                type="button"
                disabled
                title="No video link on file for this appointment — check that this practice's Daily.co account is configured under Settings"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 10l5-3v10l-5-3" />
                  <rect x="3" y="6" width="12" height="12" rx="2" />
                </svg>
                Join Video Call
              </button>
            )
          )}

          <div className="mt-4 rounded-2xl border border-border bg-surface-2 p-5">
            <dl className="space-y-2 text-[13.4px]">
              <div className="flex justify-between">
                <dt className="text-text-3">Type</dt>
                <dd className="text-foreground">{TYPE_LABEL[appt.type] ?? appt.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-3">Clinician</dt>
                <dd className="text-foreground">{clinician?.full_name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-3">Location</dt>
                <dd className="text-foreground">{appt.location_type === "telehealth" ? "Telehealth" : "Office"}</dd>
              </div>
            </dl>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-[12.5px] text-text-2">Auto-send invoice at end of appointment</span>
              {end < new Date() ? (
                <span
                  title="This appointment has already ended — the setting can no longer be changed"
                  className={`relative h-5.5 w-10 flex-none rounded-full opacity-40 ${appt.auto_send_invoice ? "bg-brand" : "bg-surface-3"}`}
                >
                  <span
                    className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow ${appt.auto_send_invoice ? "left-[19px]" : "left-0.5"}`}
                  />
                </span>
              ) : (
                <form action={updateAutoSendInvoice}>
                  <input type="hidden" name="appointmentId" value={appt.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="enabled" value={(!appt.auto_send_invoice).toString()} />
                  <button
                    type="submit"
                    aria-pressed={appt.auto_send_invoice}
                    aria-label="Automatically send invoice at the end of the appointment"
                    className={`relative h-5.5 w-10 flex-none rounded-full transition ${
                      appt.auto_send_invoice ? "bg-brand" : "bg-surface-3"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition ${
                        appt.auto_send_invoice ? "left-[19px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </form>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4">
              <Link href={`/clients/${appt.client_id}`} className="text-[12.5px] font-semibold text-brand-ink">
                View client
              </Link>
              <Link href={`/messages/${appt.client_id}`} className="text-[12.5px] font-semibold text-brand-ink">
                Message client
              </Link>
              {existingNote ? (
                <Link href={`/notes/${existingNote.id}`} className="text-[12.5px] font-semibold text-brand-ink">
                  {existingNote.status === "draft" ? "Continue draft note" : "View session note"}
                </Link>
              ) : (
                <Link
                  href={`/notes/new?appointmentId=${appt.id}&clientId=${appt.client_id}`}
                  className="text-[12.5px] font-semibold text-brand-ink"
                >
                  + Session note
                </Link>
              )}
            </div>
          </div>

          <form action={rescheduleAppointment} className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <input type="hidden" name="appointmentId" value={appt.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="mb-3 text-[13px] font-bold text-foreground">Reschedule</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Date</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={start.toISOString().slice(0, 10)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Time</label>
                <input
                  name="time"
                  type="time"
                  required
                  defaultValue={start.toTimeString().slice(0, 5)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Duration</label>
                <select
                  name="duration"
                  defaultValue={String(durationMinutes)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="30">30 min</option>
                  <option value="50">50 min</option>
                  <option value="80">80 min</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="mt-3 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Save new time
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-3">
            <form action={setAppointmentStatus}>
              <input type="hidden" name="appointmentId" value={appt.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="status" value="no_show" />
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-[13.4px] font-semibold text-warn transition hover:bg-warn-tint"
              >
                Mark no-show
              </button>
            </form>
            <form action={setAppointmentStatus}>
              <input type="hidden" name="appointmentId" value={appt.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="status" value="cancelled" />
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-[13.4px] font-semibold text-bad transition hover:bg-bad-tint"
              >
                Cancel appointment
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
