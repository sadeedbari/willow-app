import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createClientRecord } from "./actions";
import Link from "next/link";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  // Includes practice_admin -- a solo practice's owner is always
  // "practice_admin" and IS the treating clinician, so a "clinician"-only
  // query would leave this dropdown with no options but "Unassigned".
  const { data: clinicians } = await supabase
    .from("staff")
    .select("id, full_name")
    .in("role", ["clinician", "practice_admin"])
    .order("full_name");

  return (
    <div className="max-w-lg">
      <Link href="/clients" className="text-[13px] font-semibold text-brand-ink">
        ← Back to clients
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        Add client
      </h1>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
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
        <div className="grid grid-cols-2 gap-3">
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
        <div className="grid grid-cols-2 gap-3">
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
  );
}
