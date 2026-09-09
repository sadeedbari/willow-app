import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { requestBooking } from "./actions";
import { BrandMark } from "@/components/brand-mark";
import { APPOINTMENT_TYPE_DURATION_MINUTES } from "@/utils/appointment-types";

const SLOT_MINUTES = 30;
const DURATION_MINUTES = APPOINTMENT_TYPE_DURATION_MINUTES.intake;

type AvailabilityBlock = { day_of_week: number; start_time: string; end_time: string };
type BusyTime = { starts_at: string; ends_at: string };
type AvailabilityOverride = { is_unavailable: boolean; start_time: string | null; end_time: string | null };

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Identical slot-generation logic to src/app/portal/book/page.tsx, adapted
// to take a fixed duration (public links only ever book an intake).
function computeSlots(
  date: string,
  blocks: AvailabilityBlock[],
  busy: BusyTime[],
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
    for (let m = blockStartMin; m + DURATION_MINUTES <= blockEndMin; m += SLOT_MINUTES) {
      const slotStart = new Date(dayStart.getTime() + m * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + DURATION_MINUTES * 60 * 1000);
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
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; start?: string; error?: string; submitted?: string }>;
}) {
  const { slug } = await params;
  const { date, start, error, submitted } = await searchParams;
  const supabase = await createClient();

  const { data: profileRows } = await supabase.rpc("get_public_booking_profile", { p_slug: slug });
  const profile = profileRows?.[0] as
    | {
        staff_id: string;
        full_name: string;
        credential: string | null;
        specialty: string | null;
        bio: string | null;
        practice_name: string;
        practice_logo_url: string | null;
      }
    | undefined;

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
          <BrandMark size={44} />
          <h1 className="mt-4 text-[18px] font-bold text-foreground">Link not found</h1>
          <p className="mt-2 text-[13.5px] text-text-2">
            This booking link isn&apos;t available. Please contact the practice directly.
          </p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = date ?? today;

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <header className="flex items-center gap-2.5 border-b border-border bg-surface px-5 py-3.5">
        <BrandMark size={28} />
        <div>
          <div className="text-[14.5px] font-bold text-foreground">Book with {profile.full_name}</div>
          <div className="text-[11.5px] text-text-3">{profile.practice_name}</div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand to-hue-cal text-[15px] font-bold text-white">
            {initialsOf(profile.full_name)}
          </div>
          <div className="min-w-0">
            <div className="text-[14.5px] font-bold text-foreground">
              {profile.full_name}
              {profile.credential ? `, ${profile.credential}` : ""}
            </div>
            {profile.specialty && <div className="text-[12px] text-text-3">{profile.specialty}</div>}
          </div>
        </div>
        {profile.bio && <p className="mt-3 text-[13px] leading-relaxed text-text-2">{profile.bio}</p>}

        {error && (
          <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {decodeURIComponent(error)}
          </p>
        )}
        {submitted && (
          <div className="mt-4 rounded-lg bg-ok-tint px-3 py-2.5 text-[13px] text-ok">
            <div className="font-semibold">Request sent!</div>
            Check your email — {profile.full_name} will follow up to confirm.
          </div>
        )}

        {submitted ? null : start ? (
          <ConfirmRequest slug={slug} startsAt={start} date={selectedDate} staffName={profile.full_name} />
        ) : (
          <SlotPicker supabase={supabase} slug={slug} selectedDate={selectedDate} />
        )}
      </div>
    </div>
  );
}

async function SlotPicker({
  supabase,
  slug,
  selectedDate,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  slug: string;
  selectedDate: string;
}) {
  const dayStart = new Date(`${selectedDate}T00:00:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [{ data: blocks }, { data: busy }, { data: overrideRows }] = await Promise.all([
    supabase.rpc("get_public_staff_availability", { p_slug: slug }),
    supabase.rpc("get_public_staff_busy_times", {
      p_slug: slug,
      p_from: dayStart.toISOString(),
      p_to: dayEnd.toISOString(),
    }),
    supabase.rpc("get_public_staff_availability_override", { p_slug: slug, p_date: selectedDate }),
  ]);
  const override = overrideRows?.[0] as AvailabilityOverride | undefined;

  if (!blocks?.length && !override) {
    return (
      <p className="mt-5 rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
        No booking hours are open yet — please contact the practice directly to schedule.
      </p>
    );
  }

  const slots = computeSlots(selectedDate, blocks ?? [], busy ?? [], override);

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3 shadow-sm">
        <Link
          href={`/book/${slug}?date=${shiftDate(selectedDate, -1)}`}
          className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-text-2 hover:bg-surface-2"
        >
          ← Prev
        </Link>
        <div className="text-[13.4px] font-semibold text-foreground">
          {dayStart.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <Link
          href={`/book/${slug}?date=${shiftDate(selectedDate, 1)}`}
          className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-text-2 hover:bg-surface-2"
        >
          Next →
        </Link>
      </div>

      <p className="mt-3 text-[12px] text-text-3">Intake session · {DURATION_MINUTES} minutes · Telehealth</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((slot) => (
          <Link
            key={slot.toISOString()}
            href={`/book/${slug}?date=${selectedDate}&start=${encodeURIComponent(slot.toISOString())}`}
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

function ConfirmRequest({
  slug,
  startsAt,
  date,
  staffName,
}: {
  slug: string;
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
      <Link href={`/book/${slug}?date=${date}`} className="text-[12px] font-semibold text-brand-ink">
        ← Choose a different time
      </Link>
      <div className="mt-2 text-[13.4px] font-semibold text-foreground">
        Requesting {when} with {staffName}
      </div>
      <p className="mt-1 text-[12px] text-text-3">
        This is a request, not a confirmed appointment — {staffName} will follow up by email.
      </p>

      <form action={requestBooking} className="mt-4 space-y-3">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="startsAt" value={startsAt} />
        <input type="hidden" name="date" value={date} />

        {/* Honeypot: hidden from real visitors via CSS, but a generic bot
            filling every field will populate it. Any value here silently
            no-ops the submission in the server action. */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <label htmlFor="company">Company</label>
          <input type="text" id="company" name="company" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">Full name</label>
          <input
            name="fullName"
            required
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">Email</label>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">Phone (optional)</label>
          <input
            name="phone"
            type="tel"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">What brings you in? (optional)</label>
          <textarea
            name="message"
            rows={3}
            className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] leading-relaxed outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Request appointment
        </button>
      </form>
    </div>
  );
}
