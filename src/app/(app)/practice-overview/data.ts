import type { SupabaseClient } from "@supabase/supabase-js";
import { zonedStartOfMonth } from "@/utils/timezone";

// Zone-aware: "this month" must mean Toronto's calendar month, not the
// server process's own (UTC on Vercel) -- see src/utils/timezone.ts.
function firstOfMonth(d: Date, monthOffset = 0) {
  return zonedStartOfMonth(d, monthOffset);
}
function daysAgo(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() - n);
  return x;
}

export type MonthPoint = { label: string; cents: number };
export type SessionMixSlice = { label: string; type: string; pct: number; color: string };
export type ClientSessionsRow = { clientId: string; clientName: string; monthly: number[]; total: number };

export type PracticeOverviewData = {
  revenueThisMonthCents: number;
  revenueChangePct: number | null;
  activeClientCount: number;
  newClientsThisMonth: number;
  utilizationPct: number | null;
  noShowRatePct: number | null;
  notesCompliancePct: number | null;
  overdueNotesCount: number;
  outstandingBalanceCents: number;
  netCaseloadChange: number;
  revenueByMonth: MonthPoint[];
  sessionMix: SessionMixSlice[];
  sessionsByClient: ClientSessionsRow[];
};

const TYPE_COLOR: Record<string, string> = {
  individual: "#6E93C9",
  couples: "#9E8FD6",
  family: "#9E8FD6",
  intake: "#D9AD5C",
  group: "#5FA97B",
};
const TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  couples: "Couples/Family",
  family: "Couples/Family",
  intake: "Intake",
  group: "Group",
};

export async function getPracticeOverviewData(
  supabase: SupabaseClient,
  staffId: string,
  filterStaffId?: string,
  sessionsYear?: number,
): Promise<PracticeOverviewData> {
  const now = new Date();
  const monthStart = firstOfMonth(now);
  const sixMonthsAgo = firstOfMonth(now, -5);
  const thirtyDaysAgo = daysAgo(now, 30);
  const twoDaysAgo = daysAgo(now, 2);
  const year = sessionsYear ?? now.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  // "Belongs to this clinician" is defined the same way it already is on the
  // invoices page and its own RLS policy: the CLIENT's assigned clinician,
  // not whoever happened to create a given invoice -- so a billing admin
  // issuing an invoice on a clinician's behalf still counts under that
  // clinician when filtered.
  // Always embeds clients!inner(assigned_staff_id) (a static select string
  // keeps Supabase's compile-time query parser happy -- a ternary between
  // two different select strings doesn't type-check), and !inner is needed
  // for the conditional .eq("clients.assigned_staff_id", ...) filter below
  // to actually apply. Harmless when not filtering: every invoice has a
  // real client (FK, not nullable), so the inner join never drops a row.
  let invoicesQuery = supabase
    .from("invoices")
    .select("total_cents, issue_date, clients!inner(assigned_staff_id)")
    .gte("issue_date", sixMonthsAgo.toISOString().slice(0, 10));
  let outstandingQuery = supabase
    .from("invoices")
    .select("total_cents, amount_paid_cents, clients!inner(assigned_staff_id)")
    .eq("status", "sent");
  let activeClientsQuery = supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active");
  let newClientsQuery = supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .gte("created_at", monthStart.toISOString());
  let dischargedQuery = supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("status", "discharged")
    .gte("updated_at", monthStart.toISOString());
  let appointmentsQuery = supabase
    .from("appointments")
    .select("starts_at, ends_at, type, status")
    .gte("starts_at", thirtyDaysAgo.toISOString())
    .lt("starts_at", now.toISOString());
  // Session count by client, for the reporting table below -- "sessions
  // held" means a completed appointment (not just booked/scheduled, and not
  // a no-show/cancellation), scoped to the selected year.
  let sessionsByClientQuery = supabase
    .from("appointments")
    .select("starts_at, client_id, clients(full_name)")
    .eq("status", "completed")
    .gte("starts_at", yearStart.toISOString())
    .lt("starts_at", yearEnd.toISOString());

  if (filterStaffId) {
    invoicesQuery = invoicesQuery.eq("clients.assigned_staff_id", filterStaffId);
    outstandingQuery = outstandingQuery.eq("clients.assigned_staff_id", filterStaffId);
    activeClientsQuery = activeClientsQuery.eq("assigned_staff_id", filterStaffId);
    newClientsQuery = newClientsQuery.eq("assigned_staff_id", filterStaffId);
    dischargedQuery = dischargedQuery.eq("assigned_staff_id", filterStaffId);
    appointmentsQuery = appointmentsQuery.eq("staff_id", filterStaffId);
    sessionsByClientQuery = sessionsByClientQuery.eq("staff_id", filterStaffId);
  }

  const [
    { data: invoicesLast6Months },
    { count: activeClientCount },
    { count: newClientsThisMonth },
    { count: dischargedThisMonth },
    { data: recentAppointments },
    { data: availability },
    { data: notesOverview },
    { data: outstandingInvoices },
    { data: sessionsThisYear },
  ] = await Promise.all([
    invoicesQuery,
    activeClientsQuery,
    newClientsQuery,
    dischargedQuery,
    appointmentsQuery,
    // Unfiltered ("whole practice") view keeps its existing behavior of
    // using the viewing admin's own availability -- unchanged from before
    // this filter existed. Filtered to one practitioner, it's theirs.
    supabase.from("staff_availability").select("start_time, end_time").eq("staff_id", filterStaffId ?? staffId),
    supabase.rpc("get_practice_notes_overview"),
    outstandingQuery,
    sessionsByClientQuery,
  ]);

  // Revenue by month (last 6 calendar months, billed/issued basis).
  const revenueByMonth: MonthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const bucketStart = firstOfMonth(now, -i);
    const bucketEnd = firstOfMonth(now, -i + 1);
    const cents = (invoicesLast6Months ?? [])
      .filter((inv) => {
        const d = new Date(inv.issue_date);
        return d >= bucketStart && d < bucketEnd;
      })
      .reduce((sum, inv) => sum + inv.total_cents, 0);
    revenueByMonth.push({ label: bucketStart.toLocaleDateString(undefined, { month: "short" }), cents });
  }
  const revenueThisMonthCents = revenueByMonth[5].cents;
  const revenueLastMonthCents = revenueByMonth[4].cents;
  const revenueChangePct =
    revenueLastMonthCents > 0
      ? Math.round(((revenueThisMonthCents - revenueLastMonthCents) / revenueLastMonthCents) * 100)
      : null;

  // Utilization: booked minutes over the last 30 days vs. weekly capacity
  // (from recurring staff_availability) projected across that same window.
  const nonCancelled = (recentAppointments ?? []).filter((a) => a.status !== "cancelled");
  const bookedMinutes = nonCancelled.reduce(
    (sum, a) => sum + (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000,
    0,
  );
  const weeklyAvailableMinutes = (availability ?? []).reduce((sum, b) => {
    const [sh, sm] = b.start_time.split(":").map(Number);
    const [eh, em] = b.end_time.split(":").map(Number);
    return sum + (eh * 60 + em - (sh * 60 + sm));
  }, 0);
  const thirtyDayAvailableMinutes = weeklyAvailableMinutes * (30 / 7);
  const utilizationPct = thirtyDayAvailableMinutes > 0 ? Math.round((bookedMinutes / thirtyDayAvailableMinutes) * 100) : null;

  // No-show/cancellation rate over the same 30-day window.
  const resolvedAppointments = recentAppointments ?? [];
  const noShowRatePct = resolvedAppointments.length
    ? Math.round(
        (resolvedAppointments.filter((a) => a.status === "cancelled" || a.status === "no_show").length /
          resolvedAppointments.length) *
          100,
      )
    : null;

  // Session mix: share of each appointment type among non-cancelled sessions
  // in the last 30 days.
  const mixTotal = nonCancelled.length;
  const sessionMix: SessionMixSlice[] = mixTotal
    ? Object.entries(
        nonCancelled.reduce<Record<string, number>>((acc, a) => {
          acc[a.type] = (acc[a.type] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([type, count]) => ({
          type,
          label: TYPE_LABEL[type] ?? type,
          pct: Math.round((count / mixTotal) * 100),
          color: TYPE_COLOR[type] ?? "#8F86D6",
        }))
        .sort((a, b) => b.pct - a.pct)
    : [];

  // Notes compliance: of notes for sessions in the last 30 days, what
  // fraction were signed (vs. still sitting as an unsigned draft). Uses
  // get_practice_notes_overview() (metadata only, no clinical content) so
  // non-clinician roles see practice-wide counts instead of zero rows.
  // Filtered to one practitioner in JS (the RPC has no staff param) --
  // it already returns staff_id on every row for exactly this.
  type NoteOverviewRow = { session_date: string; status: string; staff_id: string };
  const allNotes = (notesOverview as NoteOverviewRow[] | null) ?? [];
  const notes = filterStaffId ? allNotes.filter((n) => n.staff_id === filterStaffId) : allNotes;
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);
  const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);
  const recentNotes = notes.filter((n) => n.session_date >= thirtyDaysAgoStr);
  const notesTotal = recentNotes.length;
  const notesSigned = recentNotes.filter((n) => n.status === "signed").length;
  const notesCompliancePct = notesTotal > 0 ? Math.round((notesSigned / notesTotal) * 100) : null;
  const overdueNotesCount = notes.filter((n) => n.status === "draft" && n.session_date < twoDaysAgoStr).length;

  const outstandingBalanceCents = (outstandingInvoices ?? []).reduce(
    (sum, inv) => sum + (inv.total_cents - inv.amount_paid_cents),
    0,
  );

  // Sessions by client, by month, for the selected year -- rows are built
  // keyed on client_id so two clients sharing one full_name (not unique)
  // never get merged into a single row.
  type SessionRow = { starts_at: string; client_id: string; clients: { full_name: string } | null };
  const sessionRows = (sessionsThisYear ?? []) as unknown as SessionRow[];
  const byClient = new Map<string, ClientSessionsRow>();
  for (const row of sessionRows) {
    const monthIndex = new Date(row.starts_at).getMonth();
    let entry = byClient.get(row.client_id);
    if (!entry) {
      entry = {
        clientId: row.client_id,
        clientName: row.clients?.full_name ?? "Unknown client",
        monthly: new Array(12).fill(0),
        total: 0,
      };
      byClient.set(row.client_id, entry);
    }
    entry.monthly[monthIndex] += 1;
    entry.total += 1;
  }
  const sessionsByClient = Array.from(byClient.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));

  return {
    revenueThisMonthCents,
    revenueChangePct,
    activeClientCount: activeClientCount ?? 0,
    newClientsThisMonth: newClientsThisMonth ?? 0,
    utilizationPct,
    noShowRatePct,
    notesCompliancePct,
    overdueNotesCount,
    outstandingBalanceCents,
    netCaseloadChange: (newClientsThisMonth ?? 0) - (dischargedThisMonth ?? 0),
    revenueByMonth,
    sessionMix,
    sessionsByClient,
  };
}
