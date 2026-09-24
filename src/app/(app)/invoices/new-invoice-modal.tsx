import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createInvoiceWithLineItems } from "./new-invoice-actions";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function NewInvoiceModal({ error, clientId }: { error?: string; clientId?: string }) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: clients }, { data: serviceCodes }, { data: clinicians }] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name"),
    supabase.from("service_codes").select("id, code, description, default_rate_cents").eq("active", true).order("code"),
    // Includes practice_admin -- a solo practice's owner is always
    // "practice_admin" and IS the treating clinician, so a "clinician"-only
    // query would leave this dropdown with no options but themselves absent.
    supabase.from("staff").select("id, full_name").in("role", ["clinician", "practice_admin"]).eq("active", true).order("full_name"),
  ]);

  return (
    <>
      <Link href="/invoices" aria-label="Close" className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[19px] font-bold tracking-tight text-foreground">New Invoice</h2>
              <p className="mt-0.5 text-[12.5px] text-text-2">
                Only the client is required — everything else can be filled in later.
              </p>
            </div>
            <Link
              href="/invoices"
              aria-label="Close"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface-2 text-text-2 transition hover:bg-surface-3 hover:text-foreground"
            >
              ×
            </Link>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {decodeURIComponent(error)}
            </p>
          )}

          <form action={createInvoiceWithLineItems} className="mt-5 space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">Client</label>
              <select
                name="clientId"
                required
                defaultValue={clientId ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="" disabled>
                  {clients?.length ? "Select a client" : "No clients yet"}
                </option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">Clinician</label>
              <select
                name="clinicianStaffId"
                required
                defaultValue={staff.role === "clinician" || staff.role === "practice_admin" ? staff.id : ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="" disabled>
                  {clinicians?.length ? "Who provided this service?" : "No clinicians on staff yet"}
                </option>
                {clinicians?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11.5px] text-text-3">
                Shown as &ldquo;Provided by&rdquo; on the invoice, with their license number.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">Due date (optional)</label>
                <input
                  name="dueDate"
                  type="date"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">Notes (optional)</label>
                <input
                  name="notes"
                  placeholder="Internal note"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {!!serviceCodes?.length && (
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">Services (optional)</label>
                <div className="mt-1.5 space-y-1.5 rounded-lg border border-border p-2.5">
                  {serviceCodes.map((sc) => (
                    <div key={sc.id} className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id={`svc-${sc.id}`}
                        name={`service_${sc.id}`}
                        value="1"
                        className="h-4 w-4 flex-none accent-brand"
                      />
                      <label htmlFor={`svc-${sc.id}`} className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                        {sc.code} · {sc.description} · {formatMoney(sc.default_rate_cents)}
                      </label>
                      <input
                        type="number"
                        name={`qty_${sc.id}`}
                        min="1"
                        defaultValue="1"
                        aria-label={`Quantity for ${sc.description}`}
                        className="w-16 flex-none rounded-lg border border-border bg-surface px-2 py-1 text-right text-[12.5px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">Custom line item (optional)</label>
              <div className="mt-1.5 grid grid-cols-[1fr_4.5rem_5.5rem] gap-2">
                <input
                  name="customDescription"
                  placeholder="Description"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <input
                  name="customQuantity"
                  type="number"
                  min="1"
                  defaultValue="1"
                  aria-label="Custom line item quantity"
                  className="rounded-lg border border-border bg-surface px-2 py-2 text-right text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <input
                  name="customRate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="$0.00"
                  aria-label="Custom line item rate"
                  className="rounded-lg border border-border bg-surface px-2 py-2 text-right text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="submit"
                name="intent"
                value="create"
                disabled={!clients?.length}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-[13.6px] font-semibold text-text-2 transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create Invoice
              </button>
              <button
                type="submit"
                name="intent"
                value="send"
                disabled={!clients?.length}
                className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Create & Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
