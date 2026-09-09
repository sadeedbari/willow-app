import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addLineItem, removeLineItem, markSent, recordPayment, voidInvoice, resendInvoice } from "./actions";

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

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  e_transfer: "E-transfer",
  cash: "Cash",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; resent?: string }>;
}) {
  const { id } = await params;
  const { error, resent } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, issue_date, due_date, total_cents, amount_paid_cents, payment_method, paid_at, notes, client_id, payment_token, clients(full_name, email), issued_by_staff_id, staff(full_name, credential, license_number, license_province)"
    )
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("id, service_date, description, service_code, quantity, unit_amount_cents, amount_cents")
    .eq("invoice_id", id)
    .order("service_date");

  const { data: serviceCodes } = await supabase
    .from("service_codes")
    .select("id, code, description, default_rate_cents")
    .eq("active", true)
    .order("code");

  const client = invoice.clients as unknown as { full_name: string; email: string | null } | null;
  const issuer = invoice.staff as unknown as {
    full_name: string;
    credential: string | null;
    license_number: string | null;
    license_province: string | null;
  } | null;

  const balance = invoice.total_cents - invoice.amount_paid_cents;
  const canManage = staff.role === "practice_admin" || staff.role === "billing_admin";
  const isDraft = invoice.status === "draft";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl">
      <Link href="/invoices" className="text-[13px] font-semibold text-brand-ink">
        ← Back to invoices
      </Link>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}
      {resent && (
        <p className="mt-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Invoice emailed to the client.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            INV-{String(invoice.invoice_number).padStart(4, "0")}
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {client?.full_name ?? "Unknown client"} · Issued {invoice.issue_date}
            {invoice.due_date ? ` · Due ${invoice.due_date}` : ""}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLE[invoice.status]}`}
          >
            {STATUS_LABEL[invoice.status]}
          </span>
          {!isDraft && invoice.status !== "void" && (
            <a
              href={`/invoices/${invoice.id}/pdf`}
              className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-text-2 transition hover:border-brand hover:text-brand-ink"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>

      {issuer && (
        <p className="mt-2 text-[12px] text-text-3">
          Provided by {issuer.full_name}
          {issuer.credential ? `, ${issuer.credential}` : ""}
          {issuer.license_number ? ` · Reg. #${issuer.license_number}` : ""}
          {issuer.license_province ? ` (${issuer.license_province})` : ""}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] font-semibold text-text-3">
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Description</th>
              <th className="px-4 py-2.5">Code</th>
              <th className="px-4 py-2.5 text-right">Qty</th>
              <th className="px-4 py-2.5 text-right">Rate</th>
              <th className="px-4 py-2.5 text-right">Amount</th>
              {isDraft && canManage && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {lineItems?.map((li) => (
              <tr key={li.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-text-2">{li.service_date}</td>
                <td className="px-4 py-2.5 text-foreground">{li.description}</td>
                <td className="px-4 py-2.5 text-text-3">{li.service_code ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-text-2">{li.quantity}</td>
                <td className="px-4 py-2.5 text-right text-text-2">{formatMoney(li.unit_amount_cents)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                  {formatMoney(li.amount_cents)}
                </td>
                {isDraft && canManage && (
                  <td className="px-4 py-2.5 text-right">
                    <form action={removeLineItem}>
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="lineItemId" value={li.id} />
                      <button type="submit" className="text-[11.5px] font-semibold text-bad">
                        Remove
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {!lineItems?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-text-3">
                  No line items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="flex items-center justify-end gap-6 border-t border-border bg-surface-2 px-4 py-3 text-[13.4px]">
          <div className="text-text-2">
            Total <span className="ml-2 font-semibold text-foreground">{formatMoney(invoice.total_cents)}</span>
          </div>
          {invoice.amount_paid_cents > 0 && (
            <div className="text-text-2">
              Paid <span className="ml-2 font-semibold text-ok">{formatMoney(invoice.amount_paid_cents)}</span>
            </div>
          )}
          {invoice.status !== "draft" && invoice.status !== "void" && (
            <div className="text-text-2">
              Balance{" "}
              <span className={`ml-2 font-semibold ${balance > 0 ? "text-warn" : "text-ok"}`}>
                {formatMoney(balance)}
              </span>
            </div>
          )}
        </div>
      </div>

      {isDraft && canManage && !!serviceCodes?.length && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 text-[13px] font-bold text-foreground">Quick add</div>
          <div className="flex flex-wrap gap-2">
            {serviceCodes.map((sc) => (
              <form key={sc.id} action={addLineItem}>
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <input type="hidden" name="serviceDate" value={today} />
                <input type="hidden" name="serviceCode" value={sc.code} />
                <input type="hidden" name="description" value={sc.description} />
                <input type="hidden" name="quantity" value="1" />
                <input type="hidden" name="unitAmount" value={(sc.default_rate_cents / 100).toFixed(2)} />
                <button
                  type="submit"
                  className="rounded-lg border border-border px-3 py-2 text-[12.5px] font-semibold text-text-2 transition hover:border-brand hover:text-brand-ink"
                >
                  + {sc.code} · {sc.description} · {formatMoney(sc.default_rate_cents)}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {isDraft && canManage && (
        <form action={addLineItem} className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <div className="mb-3 text-[13px] font-bold text-foreground">Custom line item</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Service date</label>
              <input
                name="serviceDate"
                type="date"
                required
                defaultValue={today}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Service code (optional)</label>
              <input
                name="serviceCode"
                placeholder="e.g. Individual Psychotherapy - 50 min"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[12px] font-semibold text-text-2">Description</label>
            <input
              name="description"
              required
              placeholder="Individual therapy session"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Quantity</label>
              <input
                name="quantity"
                type="number"
                min="1"
                defaultValue="1"
                required
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Rate ($ CAD)</label>
              <input
                name="unitAmount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="150.00"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Add line item
          </button>
        </form>
      )}

      {canManage && (
        <div className="mt-5 flex flex-wrap gap-3">
          <form action={resendInvoice}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <button
              type="submit"
              disabled={!client?.email}
              title={client?.email ? undefined : "This client has no email on file"}
              className="rounded-lg border border-border px-4 py-2 text-[13.4px] font-semibold text-text-2 transition hover:border-brand hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Resend invoice
            </button>
          </form>

          {balance > 0 && invoice.status !== "void" && (
            <Link
              href={`/pay/${invoice.payment_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center rounded-lg border border-border px-4 py-2 text-[13.4px] font-semibold text-text-2 transition hover:border-brand hover:text-brand-ink"
            >
              View payment page
            </Link>
          )}

          {isDraft && (
            <form action={markSent}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button
                type="submit"
                disabled={!invoice.total_cents}
                className="rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Mark as sent
              </button>
            </form>
          )}

          {(invoice.status === "sent" || invoice.status === "paid") && (
            <form action={voidInvoice}>
              <input type="hidden" name="invoiceId" value={invoice.id} />
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-[13.4px] font-semibold text-bad transition hover:bg-bad-tint"
              >
                Void invoice
              </button>
            </form>
          )}
        </div>
      )}

      {canManage && invoice.status === "sent" && (
        <form action={recordPayment} className="mt-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <div className="mb-3 text-[13px] font-bold text-foreground">Record payment</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Amount received ($ CAD)</label>
              <input
                name="amountPaid"
                type="number"
                step="0.01"
                min="0.01"
                required
                defaultValue={(balance / 100).toFixed(2)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Payment method</label>
              <select
                name="paymentMethod"
                required
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="e_transfer">E-transfer</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Record payment
          </button>
        </form>
      )}

      {invoice.status === "paid" && invoice.payment_method && (
        <p className="mt-5 text-[12.5px] text-text-3">
          Paid in full via {PAYMENT_METHOD_LABEL[invoice.payment_method]}
          {invoice.paid_at ? ` on ${new Date(invoice.paid_at).toLocaleDateString()}` : ""}.
        </p>
      )}
    </div>
  );
}
