// Every practice today is Ontario-only (see willow-app scope memory) --
// hardcoded rather than a practices.timezone column, which would be
// meaningless until the product actually supports other regions. Without
// an explicit zone, toLocaleString()/toLocaleTimeString() render in
// whatever TZ the Node process happens to run in (UTC on Vercel), showing
// a time that doesn't match what's actually stored -- every appointment
// time rendered anywhere in the app must pass this as `timeZone` so the
// calendar, invoices, emails, and portal all ever agree with each other.
export const DISPLAY_TIME_ZONE = "America/Toronto";

// The INPUT-side counterpart of the display problem above, and the more
// serious one: `new Date(`${date}T${time}`)` parses a typed/selected
// wall-clock string using the SERVER PROCESS's own timezone (UTC on
// Vercel) -- not Toronto's -- so a practitioner typing "2:00 PM" has it
// silently stored as 2:00 PM UTC (= 10:00 AM Toronto) in production. This
// converts a wall-clock date+time that's meant to represent a moment in
// `timeZone` into the real UTC instant it actually represents, so the
// value stored in the database matches what was actually typed/selected
// regardless of where the server process happens to be running. Use this
// (not a bare `new Date(...)` template string) anywhere a user-facing
// date+time pair becomes a `starts_at`/`ends_at` column, including when
// anchoring a day's business-hour slots at that day's midnight.
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string = DISPLAY_TIME_ZONE): Date {
  // First guess: treat the wall-clock string as if it were already UTC.
  const guess = new Date(`${dateStr}T${timeStr}:00.000Z`);
  // A malformed/missing date or time produces an Invalid Date here --
  // Intl.DateTimeFormat throws on one rather than formatting it, so this
  // must return early and let the caller's own "Invalid Date" validation
  // (already checking startsAt.getTime() elsewhere) catch it as usual.
  if (Number.isNaN(guess.getTime())) return guess;
  // Find out what that guessed instant actually reads as in the target
  // zone, and how far that is from the UTC guess -- that gap IS the
  // zone's real offset at this specific moment (DST-aware, unlike a fixed
  // numeric offset).
  const offsetMs = getZonedOffsetMs(guess, timeZone);
  // Shifting the guess by that gap moves it to the instant that, when
  // displayed back in the target zone, reads as the originally typed time.
  return new Date(guess.getTime() - offsetMs);
}

// The building block for "start of day/week in Toronto" -- none of that
// can be derived from a Date object's own getFullYear()/getMonth()/
// getDate()/getDay(), which all read the SERVER PROCESS's own zone.
function getZonedDateParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

// Midnight of `date`'s own calendar day in `timeZone`, as a real UTC
// instant -- the zone-aware equivalent of `new Date(d).setHours(0,0,0,0)`,
// which sets the hour fields in the server process's own zone instead
// (e.g. 8pm Toronto already reads as "tomorrow" in UTC, so a naive
// "today"/"this week" boundary silently drifts by the UTC-Toronto gap).
export function zonedStartOfDay(date: Date, timeZone: string = DISPLAY_TIME_ZONE): Date {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return zonedTimeToUtc(dateStr, "00:00", timeZone);
}

// Day of week (0=Sun..6=Sat) of `date`'s own calendar day in `timeZone` --
// the zone-aware equivalent of Date#getDay().
export function zonedDayOfWeek(date: Date, timeZone: string = DISPLAY_TIME_ZONE): number {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// Midnight of the 1st of `date`'s own calendar month in `timeZone`
// (optionally shifted by whole months), as a real UTC instant -- the
// zone-aware equivalent of `new Date(d.getFullYear(), d.getMonth(), 1)`.
export function zonedStartOfMonth(date: Date, monthOffset = 0, timeZone: string = DISPLAY_TIME_ZONE): Date {
  const { year, month } = getZonedDateParts(date, timeZone);
  const totalMonths = year * 12 + (month - 1) + monthOffset;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const dateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
  return zonedTimeToUtc(dateStr, "00:00", timeZone);
}

function getZonedOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}
