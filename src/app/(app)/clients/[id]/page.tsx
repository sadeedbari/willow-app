import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { notFound } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  on_hold: "On hold",
  discharged: "Discharged",
  waitlisted: "Waitlisted",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, date_of_birth, phone, email, presenting_concern, status, payer, balance_cents, assigned_staff_id")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, starts_at, type, status")
    .eq("client_id", id)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(5);

  const isOwnClient = client.assigned_staff_id === staff.id;
  const canSeeNotes = staff.role === "clinician" && isOwnClient;
  const canManageInvoices = staff.role === "practice_admin" || staff.role === "billing_admin";

  const { data: notes } = canSeeNotes
    ? await supabase
        .from("session_notes")
        .select("id, session_date, status, subjective")
        .eq("client_id", id)
        .order("session_date", { ascending: false })
    : { data: null };

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total_cents, amount_paid_cents")
    .eq("client_id", id)
    .order("issue_date", { ascending: false })
    .limit(5);

  return (
    <div>
      <Link href="/clients" className="text-[13px] font-semibold text-brand-ink">
        ← Back to clients
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            {client.full_name}
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {client.presenting_concern ?? "No presenting concern on file"}
          </p>
        </div>
        <span className="inline-flex rounded-full bg-ok-tint px-2.5 py-0.5 text-[11.5px] font-semibold text-ok">
          {STATUS_LABEL[client.status]}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 text-[13px] font-bold text-foreground">
            Client details
          </div>
          <dl className="space-y-2 text-[13.4px]">
            <div className="flex justify-between">
              <dt className="text-text-3">Date of birth</dt>
              <dd className="text-foreground">{client.date_of_birth ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Phone</dt>
              <dd className="text-foreground">{client.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Email</dt>
              <dd className="text-foreground">{client.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Payer</dt>
              <dd className="text-foreground">{client.payer ?? "—"}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="font-semibold text-text-2">Balance</dt>
              <dd
                className={`font-semibold ${client.balance_cents > 0 ? "text-warn" : "text-ok"}`}
              >
                ${(client.balance_cents / 100).toFixed(2)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-bold text-foreground">
              Upcoming appointments
            </div>
            <Link
              href={`/calendar/new?clientId=${client.id}`}
              className="text-[12px] font-semibold text-brand-ink"
            >
              + Schedule
            </Link>
          </div>
          {appointments?.length ? (
            <ul className="space-y-2 text-[13.4px]">
              {appointments.map((a) => (
                <li key={a.id} className="flex justify-between border-b border-border pb-2 last:border-0">
                  <span className="text-foreground">
                    {new Date(a.starts_at).toLocaleString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-text-3">{a.type}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-text-3">No upcoming appointments.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-bold text-foreground">Invoices</div>
          <div className="flex items-center gap-3">
            {invoices?.length ? (
              <Link href="/invoices" className="text-[12px] font-semibold text-brand-ink">
                View all
              </Link>
            ) : null}
            {canManageInvoices && (
              <Link
                href={`/invoices/new?clientId=${client.id}`}
                className="text-[12px] font-semibold text-brand-ink"
              >
                + New invoice
              </Link>
            )}
          </div>
        </div>
        {invoices?.length ? (
          <ul className="space-y-2 text-[13.4px]">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="flex items-center justify-between border-b border-border pb-2 last:border-0"
                >
                  <span className="text-foreground">
                    INV-{String(inv.invoice_number).padStart(4, "0")}
                  </span>
                  <span className="text-text-2">
                    ${(inv.total_cents / 100).toFixed(2)}
                    {inv.status !== "draft" && inv.status !== "void" && inv.total_cents > inv.amount_paid_cents && (
                      <span className="ml-2 text-warn">
                        (${((inv.total_cents - inv.amount_paid_cents) / 100).toFixed(2)} due)
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-text-3">No invoices yet.</p>
        )}
      </div>

      {canSeeNotes && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-bold text-foreground">
              Session notes
            </div>
            <Link
              href={`/notes/new?clientId=${client.id}`}
              className="text-[12px] font-semibold text-brand-ink"
            >
              + New note
            </Link>
          </div>
          {notes?.length ? (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-foreground">
                      {n.session_date}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        n.status === "signed" ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"
                      }`}
                    >
                      {n.status === "signed" ? "Signed" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12.5px] text-text-2">
                    {n.subjective || "No subjective notes yet."}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-text-3">No session notes yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
