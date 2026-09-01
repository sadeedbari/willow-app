import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { AppointmentModal } from "./appointment-modal";

type ApptRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  type: string;
  location_type: string;
  status: string;
  staff_id: string;
  clients: { full_name: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  couples: "Couples",
  family: "Family",
  intake: "Intake",
  group: "Group",
};

// Couples and family share one color, matching the practice's own visual
// convention of treating them as a single "Couples/Family" category.
const TYPE_COLOR: Record<string, { text: string; bg: string; border: string }> = {
  individual: { text: "text-hue-cal", bg: "bg-hue-cal-tint", border: "border-l-hue-cal" },
  couples: { text: "text-hue-notes", bg: "bg-hue-notes-tint", border: "border-l-hue-notes" },
  family: { text: "text-hue-notes", bg: "bg-hue-notes-tint", border: "border-l-hue-notes" },
  intake: { text: "text-warn", bg: "bg-warn-tint", border: "border-l-warn" },
  group: { text: "text-ok", bg: "bg-ok-tint", border: "border-l-ok" },
};

const LEGEND = [
  { label: "Individual", dot: "bg-hue-cal" },
  { label: "Couples/Family", dot: "bg-hue-notes" },
  { label: "Intake", dot: "bg-warn" },
  { label: "Telehealth", dot: "bg-text-3" },
];

const START_HOUR = 7;
const END_HOUR = 20;
const SLOT_MINUTES = 30;
const SLOT_COUNT = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
const SLOT_PX = 36;

function mondayOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toDateParam(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; staffId?: string; event?: string; error?: string }>;
}) {
  const { week, staffId, event, error } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const weekStart = mondayOf(week ? new Date(`${week}T00:00:00`) : new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const prevWeek = toDateParam(new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000));
  const nextWeek = toDateParam(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000));
  const todayParam = toDateParam(mondayOf(new Date()));

  const canFilterByClinician = staff.role === "practice_admin" || staff.role === "front_desk";
  const staffIdParam = staffId ? `&staffId=${staffId}` : "";
  const baseCalendarHref = `/calendar?week=${week ?? todayParam}${staffIdParam}`;

  const { data: clinicians } = canFilterByClinician
    ? await supabase.from("staff").select("id, full_name").in("role", ["clinician", "practice_admin"]).order("full_name")
    : { data: null };

  const selectedClinicianName = staffId
    ? clinicians?.find((c) => c.id === staffId)?.full_name
    : staff.role === "clinician"
      ? staff.fullName
      : undefined;

  let query = supabase
    .from("appointments")
    .select("id, starts_at, ends_at, type, location_type, status, staff_id, clients(full_name)")
    .gte("starts_at", weekStart.toISOString())
    .lt("starts_at", weekEnd.toISOString())
    .neq("status", "cancelled")
    .order("starts_at");

  if (canFilterByClinician && staffId) {
    query = query.eq("staff_id", staffId);
  }

  const { data } = await query;
  const appointments = (data ?? []) as unknown as ApptRow[];

  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000));

  const hourLabels = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  function bookLink(dayIndex: number, slotIndex: number) {
    const d = days[dayIndex];
    const minutes = START_HOUR * 60 + slotIndex * SLOT_MINUTES;
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    const params = new URLSearchParams({ date: toDateParam(d), time: `${hh}:${mm}` });
    if (staffId) params.set("staffId", staffId);
    return `/calendar/new?${params.toString()}`;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Calendar
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            Week of {weekStart.toLocaleDateString(undefined, { month: "long", day: "numeric" })}–
            {new Date(weekEnd.getTime() - 86400000).toLocaleDateString(undefined, { day: "numeric" })}
            {selectedClinicianName ? ` · ${selectedClinicianName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canFilterByClinician && clinicians && clinicians.length > 0 && (
            <form method="GET" className="flex items-center gap-1.5">
              <input type="hidden" name="week" value={week ?? todayParam} />
              <select
                name="staffId"
                defaultValue={staffId ?? ""}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">All clinicians</option>
                {clinicians.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2">
                Go
              </button>
            </form>
          )}
          <div className="flex items-center gap-1">
            <Link
              href={`/calendar?week=${prevWeek}${staffIdParam}`}
              aria-label="Previous week"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-2 transition hover:bg-surface-2"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </Link>
            <Link
              href={`/calendar?week=${nextWeek}${staffIdParam}`}
              aria-label="Next week"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-2 transition hover:bg-surface-2"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <Link
            href={`/calendar?week=${todayParam}${staffIdParam}`}
            className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2"
          >
            Today
          </Link>
          <Link
            href="/calendar/new"
            className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            + New
          </Link>
        </div>
      </div>

      <div className="mb-3.5 flex flex-wrap gap-2">
        {LEGEND.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-text-2"
          >
            <span className={`h-2 w-2 rounded-full ${item.dot}`} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <div
          className="grid min-w-[820px]"
          style={{
            gridTemplateColumns: `56px repeat(7, minmax(0,1fr))`,
            gridTemplateRows: `48px repeat(${SLOT_COUNT}, ${SLOT_PX}px)`,
          }}
        >
          {/* Header row */}
          <div className="sticky top-0 z-10 border-b border-border bg-surface" style={{ gridColumn: 1, gridRow: 1 }} />
          {days.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`sticky top-0 z-10 flex flex-col items-center justify-center border-b border-l border-border text-[12px] ${
                  isToday ? "bg-brand-tint text-brand-ink" : "bg-surface text-text-2"
                }`}
                style={{ gridColumn: 2 + i, gridRow: 1 }}
              >
                <span className="font-semibold">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                <span className={`text-[15px] ${isToday ? "font-bold" : "font-semibold text-foreground"}`}>{d.getDate()}</span>
              </div>
            );
          })}

          {/* Hour labels */}
          {hourLabels.map((h, i) => (
            <div
              key={h}
              className="border-t border-border px-1.5 pt-0.5 text-right text-[11px] text-text-3"
              style={{ gridColumn: 1, gridRow: `${2 + i * 2} / span 2` }}
            >
              {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
            </div>
          ))}

          {/* Background slot grid (click to book) */}
          {days.map((_, dayIndex) =>
            Array.from({ length: SLOT_COUNT }, (_, slotIndex) => (
              <Link
                key={`${dayIndex}-${slotIndex}`}
                href={bookLink(dayIndex, slotIndex)}
                className={`border-l border-border transition hover:bg-surface-2 ${slotIndex % 2 === 0 ? "border-t" : "border-t border-t-border/40"}`}
                style={{ gridColumn: 2 + dayIndex, gridRow: 2 + slotIndex }}
              />
            ))
          )}

          {/* Appointment blocks */}
          {appointments.map((a) => {
            const start = new Date(a.starts_at);
            const end = new Date(a.ends_at);
            const dayIndex = days.findIndex((d) => d.toDateString() === start.toDateString());
            if (dayIndex === -1) return null;

            const startMinutes = start.getHours() * 60 + start.getMinutes() - START_HOUR * 60;
            const durationMinutes = Math.max(SLOT_MINUTES, (end.getTime() - start.getTime()) / 60000);
            const rowStart = 2 + Math.max(0, Math.floor(startMinutes / SLOT_MINUTES));
            const rowSpan = Math.max(1, Math.round(durationMinutes / SLOT_MINUTES));
            const isPast = a.status === "completed" || a.status === "no_show";
            const color = TYPE_COLOR[a.type] ?? TYPE_COLOR.individual;

            return (
              <Link
                key={a.id}
                href={`${baseCalendarHref}&event=${a.id}`}
                className={`m-0.5 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight shadow-sm transition hover:shadow-md ${color.bg} ${color.text} ${color.border} ${isPast ? "opacity-50" : ""}`}
                style={{ gridColumn: 2 + dayIndex, gridRow: `${rowStart} / span ${rowSpan}` }}
              >
                <div className="truncate text-[10px] font-semibold opacity-80">
                  {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </div>
                <div className="truncate font-semibold">{a.clients?.full_name ?? "Unknown client"}</div>
                <div className="truncate opacity-80">{TYPE_LABEL[a.type] ?? a.type}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {event && <AppointmentModal appointmentId={event} closeHref={baseCalendarHref} error={error} />}
    </div>
  );
}
