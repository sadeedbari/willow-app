import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createInvoice } from "./actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; clientId?: string }>;
}) {
  const { error, clientId } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin" && staff.role !== "billing_admin") {
    redirect("/invoices");
  }

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .order("full_name");

  return (
    <div className="max-w-lg">
      <Link href="/invoices" className="text-[13px] font-semibold text-brand-ink">
        ← Back to invoices
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        New invoice
      </h1>
      <p className="mt-1 text-[13.5px] text-text-2">
        Add line items on the next screen once the invoice is created.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <form action={createInvoice} className="mt-5 space-y-4">
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">
            Client
          </label>
          <select
            name="clientId"
            required
            defaultValue={clientId ?? ""}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="" disabled>
              Select a client
            </option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">
            Due date (optional)
          </label>
          <input
            name="dueDate"
            type="date"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">
            Notes (optional)
          </label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Internal note — not shown to the client"
            className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Create invoice
        </button>
      </form>
    </div>
  );
}
