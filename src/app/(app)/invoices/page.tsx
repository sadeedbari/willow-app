import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";

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

export default async function InvoicesPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, issue_date, due_date, total_cents, amount_paid_cents, paid_at, clients(full_name)")
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
    clients: { full_name: string } | null;
  };
  const invoices = (data ?? []) as unknown as Row[];

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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Invoices
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {staff.role === "clinician"
              ? "Invoices for your own caseload"
              : "Client invoices across your practice"}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/invoices/new"
            className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            + New invoice
          </Link>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
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

      <div className="space-y-2">
        {invoices.map((inv) => {
          const balance = inv.total_cents - inv.amount_paid_cents;
          const isOverdue = inv.status === "sent" && !!inv.due_date && inv.due_date < today;
          return (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand"
            >
              <div>
                <div className="text-[13.4px] font-semibold text-foreground">
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
              <div className="flex items-center gap-4">
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
        {!invoices.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No invoices yet.
          </p>
        )}
      </div>
    </div>
  );
}
