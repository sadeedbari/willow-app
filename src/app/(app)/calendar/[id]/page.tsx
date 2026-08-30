import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { rescheduleAppointment, setAppointmentStatus } from "./actions";

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

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, type, location_type, status, client_id, clients(full_name), staff(full_name)")
    .eq("id", id)
    .single();

  if (!appt) notFound();

  const client = appt.clients as unknown as { full_name: string } | null;
  const clinician = appt.staff as unknown as { full_name: string } | null;
  const isScheduled = appt.status === "scheduled";
  const start = new Date(appt.starts_at);
  const end = new Date(appt.ends_at);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  return (
    <div className="max-w-lg">
      <Link href="/calendar" className="text-[13px] font-semibold text-brand-ink">
        ← Back to calendar
      </Link>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            {client?.full_name ?? "Unknown client"}
          </h1>
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
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLE[appt.status]}`}
        >
          {STATUS_LABEL[appt.status]}
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
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

        <div className="mt-4 flex gap-3 border-t border-border pt-4">
          <Link
            href={`/clients/${appt.client_id}`}
            className="text-[12.5px] font-semibold text-brand-ink"
          >
            View client
          </Link>
          <Link
            href={`/notes/new?clientId=${appt.client_id}`}
            className="text-[12.5px] font-semibold text-brand-ink"
          >
            + Session note
          </Link>
        </div>
      </div>

      {isScheduled && (
        <>
          <form action={rescheduleAppointment} className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <input type="hidden" name="appointmentId" value={appt.id} />
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
              <input type="hidden" name="status" value="completed" />
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
              >
                Mark completed
              </button>
            </form>
            <form action={setAppointmentStatus}>
              <input type="hidden" name="appointmentId" value={appt.id} />
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
              <input type="hidden" name="status" value="cancelled" />
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-[13.4px] font-semibold text-bad transition hover:bg-bad-tint"
              >
                Cancel appointment
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
