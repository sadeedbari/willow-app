import { createClient } from "@/utils/supabase/server";
import { startInvoicePayment } from "./actions";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)} CAD`;
}

type Invoice = {
  id: string;
  invoice_number: number;
  status: string;
  total_cents: number;
  amount_paid_cents: number;
  client_full_name: string;
  practice_name: string;
  practice_logo_url: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_charges_enabled: boolean;
};

type LineItem = {
  service_date: string;
  description: string;
  quantity: number;
  unit_amount_cents: number;
  amount_cents: number;
};

export default async function PayInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; paid?: string; cancelled?: string }>;
}) {
  const { token } = await params;
  const { error, paid, cancelled } = await searchParams;
  const supabase = await createClient();

  const [{ data: invoiceData }, { data: lineItemsData }] = await Promise.all([
    supabase.rpc("get_invoice_by_payment_token", { p_token: token }).maybeSingle(),
    supabase.rpc("get_invoice_line_items_by_payment_token", { p_token: token }),
  ]);
  const invoice = invoiceData as Invoice | null;
  const lineItems = (lineItemsData ?? []) as LineItem[];

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-surface-2 px-4 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-[20px] font-bold text-foreground">Link not found</h1>
          <p className="mt-2 text-[13.5px] text-text-2">
            This payment link is invalid. Please contact your practice for a new link.
          </p>
        </div>
      </div>
    );
  }

  const invoiceLabel = `INV-${String(invoice.invoice_number).padStart(4, "0")}`;
  const balanceCents = invoice.total_cents - invoice.amount_paid_cents;
  const isPaid = invoice.status === "paid" || (paid === "1" && balanceCents <= 0);
  const isVoid = invoice.status === "void";
  const canPayOnline = invoice.stripe_connect_account_id && invoice.stripe_connect_charges_enabled;

  return (
    <div className="flex min-h-screen items-start justify-center bg-surface-2 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        {invoice.practice_logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={invoice.practice_logo_url} alt="" className="mb-3 h-12 w-auto object-contain" />
        )}
        <h1 className="text-[20px] font-bold text-foreground">{invoiceLabel}</h1>
        <p className="mt-1 text-[13px] text-text-3">
          {invoice.practice_name} · Prepared for {invoice.client_full_name}
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">{decodeURIComponent(error)}</p>
        )}
        {cancelled && (
          <p className="mt-4 rounded-lg bg-warn-tint px-3 py-2 text-[13px] text-warn">
            Checkout was cancelled — no charge was made.
          </p>
        )}

        {lineItems.length > 0 && (
          <div className="mt-5 divide-y divide-border rounded-lg border border-border">
            {lineItems.map((li, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-[13px]">
                <div>
                  <div className="text-foreground">{li.description}</div>
                  <div className="text-text-3">
                    {new Date(`${li.service_date}T00:00:00`).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {li.quantity > 1 ? ` · Qty ${li.quantity}` : ""}
                  </div>
                </div>
                <div className="font-semibold text-foreground">{formatMoney(li.amount_cents)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-1 text-[13.5px]">
          <div className="flex justify-between text-text-2">
            <span>Total</span>
            <span className="font-semibold text-foreground">{formatMoney(invoice.total_cents)}</span>
          </div>
          {invoice.amount_paid_cents > 0 && (
            <div className="flex justify-between text-text-2">
              <span>Paid</span>
              <span>{formatMoney(invoice.amount_paid_cents)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-1 text-[15px] font-bold text-foreground">
            <span>Balance due</span>
            <span>{formatMoney(Math.max(balanceCents, 0))}</span>
          </div>
        </div>

        <div className="mt-5">
          {isPaid ? (
            <p className="rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
              This invoice has been paid in full. Thank you!
            </p>
          ) : isVoid ? (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-text-3">
              This invoice has been voided and does not require payment.
            </p>
          ) : !canPayOnline ? (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] text-text-3">
              Online payment isn&apos;t set up for this practice yet — please contact them directly to pay this
              invoice.
            </p>
          ) : (
            <form action={startInvoicePayment}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
              >
                Pay {formatMoney(balanceCents)}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
