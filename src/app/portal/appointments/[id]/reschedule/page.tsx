import { createClient } from "@/utils/supabase/server";
import { getCurrentClient } from "@/utils/supabase/current-client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalTabs } from "../../../tabs";
import { PortalHeader } from "../../../portal-header";
import { rescheduleMyAppointment } from "./actions";
import { parseDateParamString } from "@/utils/parse-date-param";

const SLOT_MINUTES = 30;

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
  reschedule_notice_hours: number;
};

type AvailabilityBlock = { day_of_week: number; start_time: string; end_time: string };
type BusyTime = { starts_at: string; ends_at: string };
type AvailabilityOverride = { is_unavailable: boolean; start_time: string | null; end_time: string | null };

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Identical slot-generation logic to src/app/portal/book/page.tsx and
// src/app/book/[slug]/page.tsx, adapted to exclude the appointment being
// rescheduled from its own busy-time list (otherwise it would always
// appear to conflict with itself).
function computeSlots(
  date: string,
  blocks: AvailabilityBlock[],
  busy: BusyTime[],
  durationMinutes: number,
  override?: AvailabilityOverride | null
) {
  const dayStart = new Date(`${date}T00:00:00`);
  const now = new Date();

  if (override?.is_unavailable) return [];
  const relevantBlocks =
    override && override.start_time && override.end_time
      ? [{ day_of_week: dayStart.getDay(), start_time: override.start_time, end_time: override.end_time }]
      : blocks.filter((b) => b.day_of_week === dayStart.getDay());

  const slotsByTime = new Map<number, Date>();
  for (const block of relevantBlocks) {
    const blockStartMin = timeToMinutes(block.start_time);
    const blockEndMin = timeToMinutes(block.end_time);
    for (let m = blockStartMin; m + durationMinutes <= blockEndMin; m += SLOT_MINUTES) {
      const slotStart = new Date(dayStart.getTime() + m * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
      if (slotStart <= now) continue;

      const overlapsBusy = busy.some((b) => {
        const busyStart = new Date(b.starts_at);
        const busyEnd = new Date(b.ends_at);
        return slotStart < busyEnd && slotEnd > busyStart;
      });
      if (!overlapsBusy) slotsByTime.set(slotStart.getTime(), slotStart);
    }
  }
  return [...slotsByTime.values()].sort((a, b) => a.getTime() - b.getTime());
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${parseDateParamString(date, new Date().toISOString().slice(0, 10))}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function RescheduleAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; start?: string; error?: string }>;
}) {
  const { id } = await params;
  const { date, start, error } = await searchParams;
  const client = await getCurrentClient();
  const supabase = await createClient();

  const { data: appointmentsData } = await supabase.rpc("get_my_upcoming_appointments");
  const appointment = (appointmentsData as UpcomingAppointment[] | null)?.find((a) => a.id === id);

  if (!appointment) notFound();

  const durationMinutes = Math.round(
    (new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60000
  );
  const noticeMs = appointment.reschedule_notice_hours * 60 * 60 * 1000;
  const canReschedule = new Date(appointment.starts_at).getTime() - new Date().getTime() > noticeMs;

  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = parseDateParamString(date, today);

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <PortalHeader practiceName={client.practiceName} practiceLogoUrl={client.practiceLogoUrl} clientFullName={client.fullName} />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <PortalTabs active="/portal/appointments" />

        <Link href="/portal/appointments" className="text-[12px] font-semibold text-brand-ink">
          ← Back to appointments
        </Link>

        <h1 className="mt-3 text-[18px] font-bold tracking-tight text-foreground">Reschedule Appointment</h1>
        <p className="mt-1 text-[12.5px] text-text-3">
          {TYPE_LABEL[appointment.type] ?? appointment.type} with {appointment.staff_name} · currently{" "}
          {new Date(appointment.starts_at).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {decodeURIComponent(error)}
          </p>
        )}

        {!canReschedule ? (
          <p className="mt-5 rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
            This appointment is too close to reschedule online — please contact your practice directly.
          </p>
        ) : start ? (
          <ConfirmReschedule appointmentId={id} startsAt={start} date={selectedDate} staffName={appointment.staff_name} />
        ) : (
          <RescheduleSlots
            supabase={supabase}
            appointmentId={id}
            durationMinutes={durationMinutes}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </div>
  );
}

async function RescheduleSlots({
  supabase,
  appointmentId,
  durationMinutes,
  selectedDate,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  appointmentId: string;
  durationMinutes: number;
  selectedDate: string;
}) {
  const dayStart = new Date(`${selectedDate}T00:00:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [{ data: blocks }, { data: busyData }, { data: overrideRows }] = await Promise.all([
    supabase.rpc("get_my_clinician_availability"),
    supabase.rpc("get_my_clinician_busy_times", {
      p_from: dayStart.toISOString(),
      p_to: dayEnd.toISOString(),
    }),
    supabase.rpc("get_my_clinician_availability_override", { p_date: selectedDate }),
  ]);
  const override = overrideRows?.[0] as AvailabilityOverride | undefined;

  // The appointment being rescheduled is still "scheduled" until the new
  // time is confirmed, so it shows up in the clinician's own busy times --
  // exclude it here or it would always conflict with itself.
  const { data: currentAppt } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("id", appointmentId)
    .single();
  const busy = (busyData as BusyTime[] | null)?.filter(
    (b) => !(currentAppt && b.starts_at === currentAppt.starts_at && b.ends_at === currentAppt.ends_at)
  );

  if (!blocks?.length && !override) {
    return (
      <p className="mt-5 rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
        Your clinician hasn&apos;t opened any booking hours yet — please contact them directly to reschedule.
      </p>
    );
  }

  const slots = computeSlots(selectedDate, blocks ?? [], busy ?? [], durationMinutes, override);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3 shadow-sm">
        <Link
          href={`/portal/appointments/${appointmentId}/reschedule?date=${shiftDate(selectedDate, -1)}`}
          className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-text-2 hover:bg-surface-2"
        >
          ← Prev
        </Link>
        <div className="text-[13.4px] font-semibold text-foreground">
          {dayStart.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <Link
          href={`/portal/appointments/${appointmentId}/reschedule?date=${shiftDate(selectedDate, 1)}`}
          className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-text-2 hover:bg-surface-2"
        >
          Next →
        </Link>
      </div>

      <p className="mt-3 text-[12px] text-text-3">{durationMinutes} minutes</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((slot) => (
          <Link
            key={slot.toISOString()}
            href={`/portal/appointments/${appointmentId}/reschedule?date=${selectedDate}&start=${encodeURIComponent(slot.toISOString())}`}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-center text-[12.5px] font-semibold text-text-2 transition hover:border-brand hover:bg-brand-tint hover:text-brand-ink"
          >
            {slot.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </Link>
        ))}
        {!slots.length && (
          <p className="col-span-3 rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
            No open times this day — try another date.
          </p>
        )}
      </div>
    </div>
  );
}

function ConfirmReschedule({
  appointmentId,
  startsAt,
  date,
  staffName,
}: {
  appointmentId: string;
  startsAt: string;
  date: string;
  staffName: string;
}) {
  const when = new Date(startsAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <Link
        href={`/portal/appointments/${appointmentId}/reschedule?date=${date}`}
        className="text-[12px] font-semibold text-brand-ink"
      >
        ← Choose a different time
      </Link>
      <div className="mt-2 text-[13.4px] font-semibold text-foreground">
        Move to {when} with {staffName}?
      </div>
      <p className="mt-1 text-[12px] text-text-3">
        Your practice will see the new time right away — no need to wait for confirmation.
      </p>

      <form action={rescheduleMyAppointment} className="mt-4">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="newStartsAt" value={startsAt} />
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Confirm new time
        </button>
      </form>
    </div>
  );
}
