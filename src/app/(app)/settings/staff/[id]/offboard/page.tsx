import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { offboardStaff } from "../../actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  practice_admin: "Practice Admin",
  clinician: "Clinician",
  front_desk: "Front Desk",
  billing_admin: "Billing Admin",
};

export default async function OffboardStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/settings/staff");
  }
  if (id === staff.id) {
    redirect("/settings/staff");
  }

  const supabase = await createClient();

  const [{ data: target }, { data: assignedClients }, { data: otherStaff }] = await Promise.all([
    supabase.from("staff").select("id, full_name, role, active").eq("id", id).single(),
    supabase.from("clients").select("id, full_name").eq("assigned_staff_id", id).order("full_name"),
    supabase
      .from("staff")
      .select("id, full_name, role")
      .neq("id", id)
      .eq("active", true)
      .in("role", ["clinician", "practice_admin"])
      .order("full_name"),
  ]);

  if (!target) notFound();

  const clientCount = assignedClients?.length ?? 0;

  return (
    <div className="max-w-lg">
      <Link href="/settings/staff" className="text-[13px] font-semibold text-brand-ink">
        ← Back to staff
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        Offboard {target.full_name}
      </h1>
      <p className="mt-1 text-[13px] text-text-2">
        {ROLE_LABEL[target.role]} · Deactivates their account — they won&apos;t be able to log in, but
        their past appointments, notes, and messages stay on record.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}

      <form action={offboardStaff} className="mt-5 space-y-4">
        <input type="hidden" name="staffId" value={target.id} />

        {clientCount > 0 ? (
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Reassign their {clientCount} client{clientCount === 1 ? "" : "s"} to
            </label>
            <select
              name="reassignToId"
              required
              defaultValue=""
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="" disabled>
                Select a clinician
              </option>
              {otherStaff?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11.5px] text-text-3">
              {assignedClients?.map((c) => c.full_name).join(", ")}
            </p>
          </div>
        ) : (
          <p className="text-[13px] text-text-3">They have no clients currently assigned to them.</p>
        )}

        <button
          type="submit"
          className="rounded-lg bg-bad px-4 py-2 text-[13.6px] font-semibold text-white transition hover:opacity-90"
        >
          Offboard {target.full_name}
        </button>
      </form>
    </div>
  );
}
