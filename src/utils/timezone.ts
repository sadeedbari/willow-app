// Every practice today is Ontario-only (see willow-app scope memory) --
// hardcoded rather than a practices.timezone column, which would be
// meaningless until the product actually supports other regions. Without
// an explicit zone, toLocaleString()/toLocaleTimeString() render in
// whatever TZ the Node process happens to run in (UTC on Vercel), showing
// a time that doesn't match what's actually stored -- every appointment
// time rendered anywhere in the app must pass this as `timeZone` so the
// calendar, invoices, emails, and portal all ever agree with each other.
export const DISPLAY_TIME_ZONE = "America/Toronto";
