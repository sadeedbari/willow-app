import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { requestBooking } from "./actions";
import { BrandMark } from "@/components/brand-mark";
import { APPOINTMENT_TYPE_DURATION_MINUTES, APPOINTMENT_TYPE_LABEL } from "@/utils/appointment-types";
import { parseDateParamString } from "@/utils/parse-date-param";

const SLOT_MINUTES = 30;
const DURATION_MINUTES = APPOINTMENT_TYPE_DURATION_MINUTES.intake;
const TYPE_LABEL = APPOINTMENT_TYPE_LABEL.intake;

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
  const d = new Date(`${parseDateParamString(date, new Date().toISOString().slice(0, 10))}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return shiftDate(date, -d.getDay());
}

function groupByPeriod(slots: Date[]) {
  const groups = [
    { label: "Morning", slots: [] as Date[] },
    { label: "Afternoon", slots: [] as Date[] },
    { label: "Evening", slots: [] as Date[] },
  ];
  for (const s of slots) {
    const h = s.getHours();
    if (h < 12) groups[0].slots.push(s);
    else if (h < 17) groups[1].slots.push(s);
    else groups[2].slots.push(s);
  }
  return groups.filter((g) => g.slots.length);
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 flex-none">
      <path d="M12 21c-4-2-7-6-7-11a7 7 0 0 1 14 0c0 5-3 9-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 flex-none">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 flex-none">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 flex-none">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
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
        practice_address: string | null;
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
  const selectedDate = parseDateParamString(date, today);

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <header className="flex items-center gap-2.5 border-b border-border bg-surface px-5 py-3.5">
        {profile.practice_logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.practice_logo_url} alt={profile.practice_name} className="h-7 w-7 flex-none rounded-lg object-cover" />
        ) : (
          <BrandMark size={28} />
        )}
        <span className="text-[13.6px] font-bold text-foreground">{profile.practice_name}</span>
        <Link
          href="/"
          className="ml-auto text-[11.5px] font-medium text-text-3 transition hover:text-text-2"
        >
          Powered by Willow
        </Link>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-border bg-hue-cal-tint px-5 py-2.5">
        <span className="text-[12.5px] text-text-2">Already a client here?</span>
        <Link
          href="/portal/login?next=%2Fportal%2Fbook"
          className="flex-none rounded-full bg-surface px-3 py-1.5 text-[12px] font-semibold text-hue-cal shadow-sm transition hover:bg-brand-tint hover:text-brand-ink"
        >
          Log in to book a return visit →
        </Link>
      </div>

      <section
        className="border-b border-border"
        style={{
          background:
            "radial-gradient(120% 140% at 10% 0%, var(--brand-tint) 0%, transparent 55%), radial-gradient(90% 120% at 100% 0%, rgba(110,147,201,0.14) 0%, transparent 60%)",
        }}
      >
        <div className="hero-in mx-auto max-w-2xl px-5 py-8">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-brand-ink">Book online</p>
          <div className="mt-2 flex items-start gap-4">
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand to-hue-cal text-[17px] font-bold text-white shadow-sm">
              {initialsOf(profile.full_name)}
            </div>
            <div className="min-w-0 pt-0.5">
              <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground sm:text-[25px]">
                {profile.full_name}
                {profile.credential ? `, ${profile.credential}` : ""}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-2">
                <span>{profile.practice_name}</span>
                {profile.specialty && (
                  <>
                    <span className="text-text-3">·</span>
                    <span>{profile.specialty}</span>
                  </>
                )}
              </div>
              {profile.practice_address && (
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-text-3">
                  <PinIcon />
                  {profile.practice_address}
                </p>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-[62ch] text-[13.5px] leading-relaxed text-text-2">{profile.bio}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] font-medium text-text-3">
            <span className="inline-flex items-center gap-1.5">
              <LockIcon /> Private &amp; confidential
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MailIcon /> Confirmed by email, not booked instantly
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-6">
        {error && (
          <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
            {decodeURIComponent(error)}
          </p>
        )}
        {submitted && (
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ok-tint text-ok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="mt-3 text-[15.5px] font-bold text-foreground">Request sent!</div>
            <p className="mt-1 text-[13.5px] text-text-2">
              Check your email — {profile.full_name} will follow up to confirm your appointment.
            </p>
          </div>
        )}

        {submitted ? null : start ? (
          <ConfirmRequest slug={slug} startsAt={start} date={selectedDate} staffName={profile.full_name} />
        ) : (
          <BookingFlow supabase={supabase} slug={slug} selectedDate={selectedDate} />
        )}
      </div>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 px-5 text-[11.5px] text-text-3">
          <BrandMark size={16} />
          <span>Scheduling powered by Willow</span>
        </div>
      </footer>
    </div>
  );
}

async function BookingFlow({
  supabase,
  slug,
  selectedDate,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  slug: string;
  selectedDate: string;
}) {
  const weekStart = startOfWeek(selectedDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => shiftDate(weekStart, i));
  const rangeFrom = new Date(`${weekStart}T00:00:00`);
  const rangeTo = new Date(rangeFrom.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [{ data: blocks }, { data: busy }, overrideResults] = await Promise.all([
    supabase.rpc("get_public_staff_availability", { p_slug: slug }),
    supabase.rpc("get_public_staff_busy_times", {
      p_slug: slug,
      p_from: rangeFrom.toISOString(),
      p_to: rangeTo.toISOString(),
    }),
    Promise.all(
      weekDates.map((d) => supabase.rpc("get_public_staff_availability_override", { p_slug: slug, p_date: d }))
    ),
  ]);

  const overridesByDate = new Map<string, AvailabilityOverride | undefined>(
    weekDates.map((d, i) => [d, overrideResults[i].data?.[0] as AvailabilityOverride | undefined])
  );

  const anyOverrideHasHours = [...overridesByDate.values()].some(
    (o) => o && !o.is_unavailable && o.start_time && o.end_time
  );

  if (!blocks?.length && !anyOverrideHasHours) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
        No booking hours are open yet — please contact the practice directly to schedule.
      </p>
    );
  }

  const slotsByDate = new Map(
    weekDates.map((d) => [d, computeSlots(d, blocks ?? [], busy ?? [], overridesByDate.get(d))])
  );
  const selectedSlots = slotsByDate.get(selectedDate) ?? [];
  const periods = groupByPeriod(selectedSlots);
  const todayStr = new Date().toISOString().slice(0, 10);

  const rangeLabel = `${rangeFrom.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} – ${new Date(
    rangeTo.getTime() - 24 * 60 * 60 * 1000
  ).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;

  return (
    <div>
      <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-brand-ink">Select a time</p>

      <div className="mt-2 flex items-center justify-between rounded-2xl border-2 border-brand bg-brand-tint px-4 py-3">
        <div>
          <div className="text-[14px] font-bold text-foreground">{TYPE_LABEL}</div>
          <div className="text-[12px] text-text-2">New client visit</div>
        </div>
        <div className="flex-none rounded-full bg-surface px-3 py-1 text-[12px] font-semibold text-brand-ink">
          {DURATION_MINUTES} min
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Link
          href={`/book/${slug}?date=${shiftDate(selectedDate, -7)}`}
          className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2"
        >
          ← Prev week
        </Link>
        <div className="text-[12.5px] font-semibold text-text-2">{rangeLabel}</div>
        <Link
          href={`/book/${slug}?date=${shiftDate(selectedDate, 7)}`}
          className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2"
        >
          Next week →
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {weekDates.map((d) => {
          const isSelected = d === selectedDate;
          const isToday = d === todayStr;
          const hasSlots = (slotsByDate.get(d)?.length ?? 0) > 0;
          const dayDate = new Date(`${d}T00:00:00`);
          return (
            <Link
              key={d}
              href={`/book/${slug}?date=${d}`}
              className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 transition ${
                isSelected
                  ? "border-brand bg-brand text-white shadow-sm"
                  : hasSlots
                    ? "border-border bg-surface text-foreground hover:border-brand hover:bg-brand-tint"
                    : "border-border bg-surface text-text-3 hover:bg-surface-2"
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? "text-white/80" : "text-text-3"}`}>
                {dayDate.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="text-[15px] font-bold">{dayDate.getDate()}</span>
              {isToday && (
                <span className={`text-[8.5px] font-bold uppercase tracking-wide ${isSelected ? "text-white/90" : "text-brand-ink"}`}>
                  Today
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-4">
        {periods.length ? (
          <div className="space-y-4">
            {periods.map((group) => (
              <div key={group.label}>
                <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-text-3">{group.label}</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {group.slots.map((slot) => (
                    <Link
                      key={slot.toISOString()}
                      href={`/book/${slug}?date=${selectedDate}&start=${encodeURIComponent(slot.toISOString())}`}
                      className="rounded-lg border border-border bg-surface px-2 py-2 text-center text-[12.5px] font-semibold text-text-2 transition hover:border-brand hover:bg-brand-tint hover:text-brand-ink"
                    >
                      {slot.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
            No open times this day — try another day this week, or check the next one.
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
  const startDate = new Date(startsAt);
  const endDate = new Date(startDate.getTime() + DURATION_MINUTES * 60 * 1000);
  const dayLabel = startDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const timeLabel = `${startDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${endDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;

  return (
    <div>
      <Link href={`/book/${slug}?date=${date}`} className="text-[12px] font-semibold text-brand-ink">
        ← Choose a different time
      </Link>

      <div className="mt-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="text-[11.5px] font-bold uppercase tracking-wide text-text-3">You&apos;re requesting</div>
        <div className="mt-2 space-y-1.5 text-[13.6px] text-foreground">
          <div className="flex items-center gap-2">
            <ClockIcon />
            <span className="font-semibold">{dayLabel}</span>
            <span className="text-text-2">· {timeLabel}</span>
          </div>
          <div className="flex items-center gap-2 text-text-2">
            <span className="ml-[22px]">
              {TYPE_LABEL} with {staffName}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-surface-2 p-4 text-[12.5px] leading-relaxed text-text-2">
        This is a request, not a confirmed appointment — {staffName} will follow up by email to confirm.
      </div>

      <form action={requestBooking} className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
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
        <p className="text-center text-[11.5px] text-text-3">Your information is kept private and confidential.</p>
      </form>
    </div>
  );
}
