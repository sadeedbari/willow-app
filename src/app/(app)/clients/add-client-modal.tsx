import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { createClientRecord } from "./add-client-actions";

export async function AddClientModal({ error }: { error?: string }) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  // Includes practice_admin -- a solo practice's owner is always
  // "practice_admin" and IS the treating clinician, so a "clinician"-only
  // query would leave this dropdown with no options but "Unassigned".
  const { data: clinicians } = await supabase
    .from("staff")
    .select("id, full_name")
    .in("role", ["clinician", "practice_admin"])
    .eq("active", true)
    .order("full_name");

  return (
    <>
      <Link href="/clients" aria-label="Close" className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <h2 className="text-[19px] font-bold tracking-tight text-foreground">Add client</h2>
            <Link
              href="/clients"
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-text-2 transition hover:bg-surface-3 hover:text-foreground"
            >
              ×
            </Link>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {decodeURIComponent(error)}
            </p>
          )}

          <form action={createClientRecord} className="mt-5 space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">
                Full name
              </label>
              <input
                name="fullName"
                required
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">
                  Date of birth
                </label>
                <input
                  name="dateOfBirth"
                  type="date"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">
                  Phone
                </label>
                <input
                  name="phone"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">
                Email
              </label>
              <input
                name="email"
                type="email"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">
                Presenting concern
              </label>
              <input
                name="presentingConcern"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">
                  Assigned clinician
                </label>
                <select
                  name="assignedStaffId"
                  defaultValue={staff.role === "clinician" || staff.role === "practice_admin" ? staff.id : ""}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="">Unassigned</option>
                  {clinicians?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">
                  Payer
                </label>
                <input
                  name="payer"
                  placeholder="e.g. Self-pay"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Add client
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
