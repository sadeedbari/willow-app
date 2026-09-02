import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { updateClient } from "./edit-actions";
import { APPOINTMENT_TYPE_LABEL, SELF_BOOKABLE_TYPES } from "@/utils/appointment-types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "discharged", label: "Discharged" },
  { value: "waitlisted", label: "Waitlisted" },
];

type EditableClient = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  presenting_concern: string | null;
  status: string;
  payer: string | null;
  session_frequency: string | null;
  assigned_staff_id: string | null;
  default_appointment_type: string | null;
};

export async function EditClientModal({
  client,
  closeHref,
  error,
}: {
  client: EditableClient;
  closeHref: string;
  error?: string;
}) {
  const supabase = await createClient();
  const { data: clinicians } = await supabase
    .from("staff")
    .select("id, full_name")
    .in("role", ["clinician", "practice_admin"])
    .order("full_name");

  return (
    <>
      <Link href={closeHref} aria-label="Close" className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <h2 className="text-[19px] font-bold tracking-tight text-foreground">Edit Client</h2>
            <Link
              href={closeHref}
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

          <form action={updateClient} className="mt-5 space-y-3">
            <input type="hidden" name="clientId" value={client.id} />
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Full name</label>
              <input
                name="fullName"
                required
                defaultValue={client.full_name}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Date of birth</label>
                <input
                  name="dateOfBirth"
                  type="date"
                  defaultValue={client.date_of_birth ?? ""}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Status</label>
                <select
                  name="status"
                  defaultValue={client.status}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Phone</label>
                <input
                  name="phone"
                  defaultValue={client.phone ?? ""}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={client.email ?? ""}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-2">Presenting concern</label>
              <input
                name="presentingConcern"
                defaultValue={client.presenting_concern ?? ""}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Session frequency</label>
                <select
                  name="sessionFrequency"
                  defaultValue={client.session_frequency ?? ""}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="">Not set</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Biweekly">Biweekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="As needed">As needed</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Payer</label>
                <input
                  name="payer"
                  placeholder="e.g. Self-pay"
                  defaultValue={client.payer ?? ""}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-2">Assigned clinician</label>
                <select
                  name="assignedStaffId"
                  defaultValue={client.assigned_staff_id ?? ""}
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
                <label className="block text-[12px] font-semibold text-text-2">Default self-booking type</label>
                <select
                  name="defaultAppointmentType"
                  defaultValue={client.default_appointment_type ?? ""}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="">Not set</option>
                  {SELF_BOOKABLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {APPOINTMENT_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Save changes
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
