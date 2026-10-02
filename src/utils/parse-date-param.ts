import { zonedTimeToUtc } from "@/utils/timezone";

// A date-ish search param ("?week=", "?date=") can be missing, empty, or
// garbage -- a hand-edited URL, a stale bookmark, a scraper. `new Date(bad)`
// silently produces an Invalid Date rather than throwing, and it's only the
// later `.toISOString()` call (building the next query, the next/prev link,
// etc.) that throws a RangeError -- by which point the real cause is far
// from the error. Validating up front and falling back avoids that crash
// entirely instead of chasing it downstream.
//
// Uses zonedTimeToUtc rather than `new Date(`${value}T00:00:00`)` -- a
// bare local-time string parses in the SERVER PROCESS's own zone (UTC on
// Vercel), not Toronto's, so a caller that re-derives a calendar day from
// the result via zone-aware helpers (zonedStartOfDay/zonedDayOfWeek, see
// calendar/page.tsx's mondayOf) would silently roll the date back by a day
// in production -- the same class of bug as the rest of timezone.ts, just
// on the input side of a URL param instead of a form field.
export function parseDateParam(value: string | undefined | null, fallback: Date): Date {
  if (value) {
    const parsed = zonedTimeToUtc(value, "00:00");
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

// Same validation, for callers that just want back a clean "YYYY-MM-DD"
// string (e.g. to reuse as the fallback value for a `date` search param).
export function parseDateParamString(value: string | undefined | null, fallback: string): string {
  if (value) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return value;
  }
  return fallback;
}
