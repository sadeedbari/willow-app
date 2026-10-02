import type { SupabaseClient } from "@supabase/supabase-js";
import { zonedStartOfDay, zonedDayOfWeek, zonedStartOfMonth } from "@/utils/timezone";

// Zone-aware: "today"/"this week" must mean Toronto's calendar day, not
// the server process's own (UTC on Vercel) -- see src/utils/timezone.ts.
function startOfDay(d: Date) {
  return zonedStartOfDay(d);
}
function mondayOf(d: Date) {
  const x = startOfDay(d);
  const day = zonedDayOfWeek(d); // 0=Sun..6=Sat
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

export type TodayAppointment = {
  id: string;
  starts_at: string;
  type: string;
  location_type: string;
  client_id: string;
  clients: { full_name: string } | null;
  staff: { full_name: string } | null;
};

export type AttentionItem = { kind: "note" | "consent" | "balance"; label: string; text: string; href: string };

export type MessagePreview = { id: string; client_id: string; full_name: string; preview: string };

export type DashboardData = {
  activeClientCount: number;
  newClientsThisMonth: number;
  weekSessionCount: number;
  weeklyUtilizationPct: number | null;
  notesDueCount: number;
  oldestDueNote: { client_name: string; session_date: string; when: string } | null;
  pendingConsentCount: number;
  collectedThisMonthCents: number;
  collectedChangePct: number | null;
  todayAppointments: TodayAppointment[];
  attentionItems: AttentionItem[];
};

export async function getDashboardData(
  supabase: SupabaseClient,
  staffId: string,
  role: "practice_admin" | "clinician" | "front_desk" | "billing_admin",
): Promise<DashboardData> {
  // A clinician's "Today's schedule" and utilization are personal (their own
  // caseload). Everyone else's dashboard already shows practice-wide numbers
  // for caseload/notes/revenue via RLS -- filtering their own schedule down
  // to just their own appointments (usually zero, for a pure admin) made the
  // page show an empty "Today's schedule" next to whole-practice revenue, an
  // incoherent mix of "my data" and "practice data". So for non-clinician
  // roles, show the practice-wide schedule/utilization instead.
  const personalScope = role === "clinician";
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekStart = mondayOf(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const monthStart = zonedStartOfMonth(now);
  const lastMonthStart = zonedStartOfMonth(now, -1);
  const todayStr = todayStart.toISOString().slice(0, 10);

  const [
    { count: activeClientCount },
    { count: newClientsThisMonth },
    { data: weekAppointments },
    { data: todayAppointments },
    { data: availability },
    { data: notesOverview },
    { data: pendingConsent },
    { data: paidThisMonth },
    { data: paidLastMonth },
    { data: outstandingInvoices },
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", monthStart.toISOString()),
    (personalScope
      ? supabase.from("appointments").select("starts_at, ends_at").eq("staff_id", staffId)
      : supabase.from("appointments").select("starts_at, ends_at"))
      .neq("status", "cancelled")
      .gte("starts_at", weekStart.toISOString())
      .lt("starts_at", weekEnd.toISOString()),
    (personalScope
      ? supabase.from("appointments").select("id, starts_at, type, location_type, client_id, clients(full_name), staff(full_name)").eq("staff_id", staffId)
      : supabase.from("appointments").select("id, starts_at, type, location_type, client_id, clients(full_name), staff(full_name)"))
      .neq("status", "cancelled")
      .gte("starts_at", todayStart.toISOString())
      .lt("starts_at", todayEnd.toISOString())
      .order("starts_at"),
    personalScope
      ? supabase.from("staff_availability").select("start_time, end_time").eq("staff_id", staffId)
      : role === "practice_admin"
        ? supabase.from("staff_availability").select("start_time, end_time")
        : Promise.resolve({ data: [] as { start_time: string; end_time: string }[] }),
    supabase.rpc("get_practice_notes_overview"),
    supabase.from("consent_forms").select("id, clients(full_name)").eq("status", "pending"),
    supabase.from("invoices").select("amount_paid_cents").eq("status", "paid").gte("paid_at", monthStart.toISOString()),
    supabase
      .from("invoices")
      .select("amount_paid_cents")
      .eq("status", "paid")
      .gte("paid_at", lastMonthStart.toISOString())
      .lt("paid_at", monthStart.toISOString()),
    supabase
      .from("invoices")
      .select("id, total_cents, amount_paid_cents, due_date, clients(full_name)")
      .eq("status", "sent"),
  ]);

  // Weekly utilization: booked minutes this week vs. total available minutes
  // per week from the recurring staff_availability blocks (each block occurs
  // once per calendar week, so summing them all gives one week's capacity).
  const bookedMinutes = (weekAppointments ?? []).reduce(
    (sum, a) => sum + (new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000,
    0,
  );
  const availableMinutes = (availability ?? []).reduce((sum, b) => {
    const [sh, sm] = b.start_time.split(":").map(Number);
    const [eh, em] = b.end_time.split(":").map(Number);
    return sum + (eh * 60 + em - (sh * 60 + sm));
  }, 0);
  const weeklyUtilizationPct = availableMinutes > 0 ? Math.round((bookedMinutes / availableMinutes) * 100) : null;

  type NoteOverviewRow = {
    id: string;
    session_date: string;
    status: string;
    client_id: string;
    client_full_name: string;
    staff_id: string;
    staff_full_name: string;
    subjective_preview: string | null;
  };
  const draftNotes = (notesOverview as NoteOverviewRow[] | null ?? [])
    .filter((n) => n.status === "draft")
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
  const oldestDue = draftNotes[0];

  const collectedThisMonthCents = (paidThisMonth ?? []).reduce((sum, i) => sum + i.amount_paid_cents, 0);
  const collectedLastMonthCents = (paidLastMonth ?? []).reduce((sum, i) => sum + i.amount_paid_cents, 0);
  const collectedChangePct =
    collectedLastMonthCents > 0
      ? Math.round(((collectedThisMonthCents - collectedLastMonthCents) / collectedLastMonthCents) * 100)
      : null;

  const attentionItems: AttentionItem[] = [];

  let oldestDueWhen = "";
  if (oldestDue) {
    const daysDiff = Math.round((todayStart.getTime() - new Date(oldestDue.session_date).getTime()) / 86400000);
    oldestDueWhen =
      daysDiff <= 0
        ? "due today"
        : `from ${new Date(oldestDue.session_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    attentionItems.push({
      kind: "note",
      label: "Note due",
      text: `${oldestDue.client_full_name ?? "A client"}'s note ${oldestDueWhen} is unsigned.`,
      href: "/notes?tab=unsigned",
    });
  }

  const consentNames = (pendingConsent ?? [])
    .map((c) => (c.clients as unknown as { full_name: string } | null)?.full_name)
    .filter((n): n is string => !!n);
  if (consentNames.length) {
    const names =
      consentNames.length > 2
        ? `${consentNames.slice(0, 2).join(", ")} & ${consentNames.length - 2} more`
        : consentNames.join(" & ");
    attentionItems.push({
      kind: "consent",
      label: "Consent",
      text: `${names} awaiting e-signature.`,
      href: "/forms?tab=pending",
    });
  }

  const overdue = (outstandingInvoices ?? []).filter((i) => i.due_date && i.due_date < todayStr);
  if (overdue.length) {
    const worst = overdue.reduce((a, b) => (b.total_cents - b.amount_paid_cents > a.total_cents - a.amount_paid_cents ? b : a));
    const balance = ((worst.total_cents - worst.amount_paid_cents) / 100).toFixed(2);
    const clientName = (worst.clients as unknown as { full_name: string } | null)?.full_name ?? "A client";
    const text =
      overdue.length > 1
        ? `${clientName} has an overdue invoice of $${balance} (${overdue.length - 1} more overdue).`
        : `${clientName} has an overdue invoice of $${balance}.`;
    attentionItems.push({ kind: "balance", label: "Balance", text, href: "/invoices" });
  }

  return {
    activeClientCount: activeClientCount ?? 0,
    newClientsThisMonth: newClientsThisMonth ?? 0,
    weekSessionCount: (weekAppointments ?? []).length,
    weeklyUtilizationPct,
    notesDueCount: draftNotes.length,
    oldestDueNote: oldestDue
      ? { client_name: oldestDue.client_full_name ?? "Unknown", session_date: oldestDue.session_date, when: oldestDueWhen }
      : null,
    pendingConsentCount: pendingConsent?.length ?? 0,
    collectedThisMonthCents,
    collectedChangePct,
    todayAppointments: (todayAppointments ?? []) as unknown as TodayAppointment[],
    attentionItems,
  };
}
