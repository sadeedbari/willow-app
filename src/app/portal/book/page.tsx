import { createClient } from "@/utils/supabase/server";
import { getCurrentClient } from "@/utils/supabase/current-client";
import Link from "next/link";
import { PortalTabs } from "../tabs";
import { bookAppointment } from "./actions";
import { PortalHeader } from "../portal-header";
import { isThreadUnread } from "@/utils/messaging";
import {
  APPOINTMENT_TYPE_DURATION_MINUTES,
  APPOINTMENT_TYPE_LABEL,
  SELF_BOOKABLE_TYPES,
  type SelfBookableType,
} from "@/utils/appointment-types";
import { parseDateParamString } from "@/utils/parse-date-param";
import { DISPLAY_TIME_ZONE } from "@/utils/timezone";

const SLOT_MINUTES = 30;

type AvailabilityBlock = { day_of_week: number; start_time: string; end_time: string };
type BusyTime = { starts_at: string; ends_at: string };
type AvailabilityOverride = { is_unavailable: boolean; start_time: string | null; end_time: string | null };

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function computeSlots(
  date: string,
  blocks: AvailabilityBlock[],
  busy: BusyTime[],
  durationMinutes: number,
  override?: AvailabilityOverride | null
) {
  const dayStart = new Date(`${date}T00:00:00`);
  const now = new Date();

  // A custom date (holiday, vacation, one-off hours) fully replaces the
  // weekly pattern for that date -- either no hours at all, or a single
  // override range instead of the day-of-week blocks.
  if (override?.is_unavailable) return [];
  const relevantBlocks =
    override && override.start_time && override.end_time
      ? [{ day_of_week: dayStart.getDay(), start_time: override.start_time, end_time: override.end_time }]
      : blocks.filter((b) => b.day_of_week === dayStart.getDay());

  // A staff member's blocks for a day can legitimately overlap (e.g. two
  // separate ranges added for flexibility) -- dedupe by start time so the
  // slot grid never renders the same bookable time twice.
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

export default async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; type?: string; start?: string; error?: string; booked?: string }>;
}) {
  const { date, type, start, error, booked } = await searchParams;
  const client = await getCurrentClient();
  const supabase = await createClient();

  const effectiveType = (client.defaultAppointmentType ?? type) as SelfBookableType | undefined;

  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = parseDateParamString(date, today);

  const { data: thread } = await supabase
    .from("message_threads")
    .select("client_last_read_at, updated_at")
    .eq("client_id", client.id)
    .maybeSingle();
  const unreadMessages = !!thread && isThreadUnread(thread.client_last_read_at, thread.updated_at);

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <PortalHeader practiceName={client.practiceName} practiceLogoUrl={client.practiceLogoUrl} clientFullName={client.fullName} />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <PortalTabs active="/portal/book" unreadMessages={unreadMessages} />

        <h1 className="mt-4 text-[18px] font-bold tracking-tight text-foreground">Book Appointment</h1>
        <p className="mt-1 text-[12.5px] text-text-3">Pick an open time with your clinician.</p>

        {error && (
          <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {decodeURIComponent(error)}
          </p>
        )}
        {booked && (
          <p className="mt-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
            Appointment booked! You&apos;ll see it reflected the next time your clinician confirms.
          </p>
        )}

        {!effectiveType ? (
          <form className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-sm" method="GET">
            <div className="mb-3 text-[13px] font-bold text-foreground">
              What kind of session do you need?
            </div>
            <p className="mb-3 text-[12px] text-text-3">
              This becomes your default for future bookings — only your clinician can change it afterward.
            </p>
            <div className="space-y-2">
              {SELF_BOOKABLE_TYPES.map((t) => (
                <label
                  key={t}
                  className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-[13.4px] text-foreground has-[:checked]:border-brand has-[:checked]:bg-brand-tint"
                >
                  <input type="radio" name="type" value={t} required />
                  {APPOINTMENT_TYPE_LABEL[t]}
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="mt-4 rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Continue
            </button>
          </form>
        ) : start ? (
          <ConfirmBooking effectiveType={effectiveType} startsAt={start} date={selectedDate} />
        ) : (
          <BookingSlots
            client={client}
            supabase={supabase}
            effectiveType={effectiveType}
            selectedDate={selectedDate}
          />
        )}
      </div>
    </div>
  );
}

async function BookingSlots({
  client,
  supabase,
  effectiveType,
  selectedDate,
}: {
  client: Awaited<ReturnType<typeof getCurrentClient>>;
  supabase: Awaited<ReturnType<typeof createClient>>;
  effectiveType: SelfBookableType;
  selectedDate: string;
}) {
  const dayStart = new Date(`${selectedDate}T00:00:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const durationMinutes = APPOINTMENT_TYPE_DURATION_MINUTES[effectiveType];

  const [{ data: blocks }, { data: busy }, { data: overrideRows }] = await Promise.all([
    supabase.rpc("get_my_clinician_availability"),
    supabase.rpc("get_my_clinician_busy_times", {
      p_from: dayStart.toISOString(),
      p_to: dayEnd.toISOString(),
    }),
    supabase.rpc("get_my_clinician_availability_override", { p_date: selectedDate }),
  ]);
  const override = overrideRows?.[0] as AvailabilityOverride | undefined;

  if (!blocks?.length && !override) {
    return (
      <p className="mt-5 rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
        Your clinician hasn&apos;t opened any booking hours yet — please contact them directly to schedule.
      </p>
    );
  }

  const slots = computeSlots(selectedDate, blocks ?? [], busy ?? [], durationMinutes, override);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3 shadow-sm">
        <Link
          href={`/portal/book?date=${shiftDate(selectedDate, -1)}&type=${effectiveType}`}
          className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-text-2 hover:bg-surface-2"
        >
          ← Prev
        </Link>
        <div className="text-[13.4px] font-semibold text-foreground">
          {dayStart.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <Link
          href={`/portal/book?date=${shiftDate(selectedDate, 1)}&type=${effectiveType}`}
          className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-text-2 hover:bg-surface-2"
        >
          Next →
        </Link>
      </div>

      <p className="mt-3 text-[12px] text-text-3">
        {APPOINTMENT_TYPE_LABEL[effectiveType]} · {durationMinutes} minutes
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((slot) => (
          <Link
            key={slot.toISOString()}
            href={`/portal/book?date=${selectedDate}&type=${effectiveType}&start=${encodeURIComponent(slot.toISOString())}`}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-center text-[12.5px] font-semibold text-text-2 transition hover:border-brand hover:bg-brand-tint hover:text-brand-ink"
          >
            {slot.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: DISPLAY_TIME_ZONE })}
          </Link>
        ))}
        {!slots.length && (
          <p className="col-span-3 rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
            No open times this day — try another date.
          </p>
        )}
      </div>

      {!client.defaultAppointmentType && (
        <Link
          href="/portal/book"
          className="mt-3 inline-block text-[11.5px] font-semibold text-brand-ink"
        >
          ← Choose a different session type
        </Link>
      )}
    </div>
  );
}

function ConfirmBooking({
  effectiveType,
  startsAt,
  date,
}: {
  effectiveType: SelfBookableType;
  startsAt: string;
  date: string;
}) {
  const durationMinutes = APPOINTMENT_TYPE_DURATION_MINUTES[effectiveType];
  const when = new Date(startsAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  });

  return (
    <div className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <Link
        href={`/portal/book?date=${date}&type=${effectiveType}`}
        className="text-[12px] font-semibold text-brand-ink"
      >
        ← Choose a different time
      </Link>
      <div className="mt-2 text-[13.4px] font-semibold text-foreground">Confirm this appointment</div>
      <p className="mt-1 text-[12.5px] text-text-2">
        {APPOINTMENT_TYPE_LABEL[effectiveType]} · {when} · {durationMinutes} minutes
      </p>

      <form action={bookAppointment} className="mt-4">
        <input type="hidden" name="startsAt" value={startsAt} />
        <input type="hidden" name="type" value={effectiveType} />
        <input type="hidden" name="date" value={date} />
        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Confirm booking
        </button>
      </form>
    </div>
  );
}
