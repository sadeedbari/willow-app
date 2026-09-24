import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { avatarColorFor, initialsOf } from "@/utils/avatar-color";
import { NewInvoiceModal } from "./new-invoice-modal";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-surface-2 text-text-3",
  sent: "bg-hue-cal-tint text-hue-cal",
  paid: "bg-ok-tint text-ok",
  void: "bg-bad-tint text-bad",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function StatCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="text-[12.5px] font-semibold text-text-2">{label}</div>
      <div className={`mt-1 text-[22px] font-bold tracking-tight tabular-nums ${valueClassName ?? "text-foreground"}`}>
        {value}
      </div>
      <div className="mt-1 text-[12px] text-text-3">{detail}</div>
    </div>
  );
}

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Outstanding" },
  { key: "paid", label: "Paid" },
  { key: "void", label: "Void" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; new?: string; error?: string; clientId?: string; staffId?: string }>;
}) {
  const { status, new: showNew, error, clientId, staffId } = await searchParams;
  const activeStatus = STATUS_FILTERS.some((s) => s.key === status) ? status! : "all";
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  // Same audience as "invoices across your practice" below -- a clinician's
  // own view is already scoped to their own caseload by RLS, so the filter
  // would just be a confusing no-op for them.
  const canFilterByClinician = staff.role !== "clinician";
  const staffIdParam = staffId ? `&staffId=${staffId}` : "";

  const { data: clinicians } = canFilterByClinician
    ? await supabase.from("staff").select("id, full_name").in("role", ["clinician", "practice_admin"]).eq("active", true).order("full_name")
    : { data: null };

  const selectedClinicianName = staffId ? clinicians?.find((c) => c.id === staffId)?.full_name : undefined;

  const { data } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, issue_date, due_date, total_cents, amount_paid_cents, paid_at, client_id, clients(full_name, assigned_staff_id)"
    )
    .order("issue_date", { ascending: false })
    .order("invoice_number", { ascending: false });

  type Row = {
    id: string;
    invoice_number: number;
    status: string;
    issue_date: string;
    due_date: string | null;
    total_cents: number;
    amount_paid_cents: number;
    paid_at: string | null;
    client_id: string;
    clients: { full_name: string; assigned_staff_id: string | null } | null;
  };
  const allInvoices = (data ?? []) as unknown as Row[];
  const invoices =
    canFilterByClinician && staffId
      ? allInvoices.filter((inv) => inv.clients?.assigned_staff_id === staffId)
      : allInvoices;

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const outstanding = invoices.filter((inv) => inv.status === "sent");
  const outstandingCents = outstanding.reduce((sum, inv) => sum + (inv.total_cents - inv.amount_paid_cents), 0);

  const overdue = outstanding.filter((inv) => inv.due_date && inv.due_date < today);
  const overdueCents = overdue.reduce((sum, inv) => sum + (inv.total_cents - inv.amount_paid_cents), 0);

  const paidThisMonth = invoices.filter(
    (inv) =>
      inv.status === "paid" &&
      inv.paid_at &&
      new Date(inv.paid_at).getMonth() === now.getMonth() &&
      new Date(inv.paid_at).getFullYear() === now.getFullYear()
  );
  const collectedCents = paidThisMonth.reduce((sum, inv) => sum + inv.amount_paid_cents, 0);

  const canCreate = staff.role === "practice_admin" || staff.role === "billing_admin";
  const filteredInvoices = activeStatus === "all" ? invoices : invoices.filter((inv) => inv.status === activeStatus);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Invoices
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {staff.role === "clinician"
              ? "Invoices for your own caseload"
              : `Client invoices across your practice${selectedClinicianName ? ` · ${selectedClinicianName}` : ""}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canFilterByClinician && clinicians && clinicians.length > 0 && (
            <form method="GET" className="flex items-center gap-1.5">
              {activeStatus !== "all" && <input type="hidden" name="status" value={activeStatus} />}
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
          {canCreate && (
            <Link
              href="/invoices?new=1"
              className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
            >
              + New invoice
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Outstanding"
          value={formatMoney(outstandingCents)}
          detail={`${outstanding.length} invoice${outstanding.length === 1 ? "" : "s"}`}
          valueClassName="text-warn"
        />
        <StatCard
          label="Collected this month"
          value={formatMoney(collectedCents)}
          detail={`${paidThisMonth.length} invoice${paidThisMonth.length === 1 ? "" : "s"}`}
          valueClassName="text-ok"
        />
        <StatCard
          label="Overdue"
          value={formatMoney(overdueCents)}
          detail={`${overdue.length} invoice${overdue.length === 1 ? "" : "s"}`}
          valueClassName="text-bad"
        />
      </div>

      <div className="mb-5 flex gap-1 border-b border-border">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s.key}
            href={s.key === "all" ? `/invoices${staffIdParam ? `?${staffIdParam.slice(1)}` : ""}` : `/invoices?status=${s.key}${staffIdParam}`}
            className={`-mb-px border-b-2 px-2.5 pb-2 text-[13.4px] font-semibold transition ${
              activeStatus === s.key
                ? "border-brand text-foreground"
                : "border-transparent text-text-3 hover:text-foreground"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {filteredInvoices.map((inv) => {
          const balance = inv.total_cents - inv.amount_paid_cents;
          const isOverdue = inv.status === "sent" && !!inv.due_date && inv.due_date < today;
          const color = avatarColorFor(inv.client_id);
          return (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12.5px] font-bold ${color.bg} ${color.text}`}
                >
                  {initialsOf(inv.clients?.full_name ?? "?")}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13.4px] font-semibold text-foreground">
                    INV-{String(inv.invoice_number).padStart(4, "0")}
                    <span className="ml-2 font-normal text-text-3">
                      · {inv.clients?.full_name ?? "Unknown client"}
                    </span>
                  </div>
                  <div className="mt-1 text-[12px] text-text-3">
                    Issued {inv.issue_date}
                    {inv.due_date ? ` · Due ${inv.due_date}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex flex-none items-center gap-4">
                <div className="text-right">
                  <div className="text-[13.4px] font-semibold text-foreground">
                    {formatMoney(inv.total_cents)}
                  </div>
                  {balance > 0 && inv.status !== "draft" && inv.status !== "void" && (
                    <div className="text-[11.5px] text-warn">
                      {formatMoney(balance)} due
                    </div>
                  )}
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    isOverdue ? "bg-bad-tint text-bad" : STATUS_STYLE[inv.status]
                  }`}
                >
                  {isOverdue ? "Overdue" : STATUS_LABEL[inv.status]}
                </span>
              </div>
            </Link>
          );
        })}
        {!filteredInvoices.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            {activeStatus === "all" ? "No invoices yet." : `No ${activeStatus} invoices.`}
          </p>
        )}
      </div>

      {canCreate && showNew && <NewInvoiceModal error={error} clientId={clientId} />}
    </div>
  );
}
