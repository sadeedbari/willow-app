import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { createAppointment } from "./new/actions";
import { ClientClinicianFields } from "./client-clinician-fields";

export async function NewAppointmentModal({
  closeHref,
  reopenHref,
  date,
  time,
  clientId,
  staffId,
  error,
}: {
  closeHref: string;
  reopenHref: string;
  date?: string;
  time?: string;
  clientId?: string;
  staffId?: string;
  error?: string;
}) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: clients }, { data: clinicians }, { data: practice }] = await Promise.all([
    supabase.from("clients").select("id, full_name, assigned_staff_id").order("full_name"),
    staff.role === "clinician"
      ? Promise.resolve({ data: null })
      : supabase
          .from("staff")
          .select("id, full_name")
          .in("role", ["clinician", "practice_admin"])
          .eq("active", true)
          .order("full_name"),
    supabase.from("practices").select("auto_send_invoice_default").eq("id", staff.practiceId).single(),
  ]);

  const today = date ?? new Date().toISOString().slice(0, 10);
  const defaultTime = time ?? "14:00";

  return (
    <>
      <Link href={closeHref} aria-label="Close" className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <h2 className="text-[19px] font-bold tracking-tight text-foreground">New appointment</h2>
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

          <form action={createAppointment} className="mt-5 space-y-4">
            <input type="hidden" name="returnTo" value={closeHref} />
            <input type="hidden" name="reopenHref" value={reopenHref} />
            <ClientClinicianFields
              clients={clients ?? []}
              clinicians={clinicians}
              defaultClientId={clientId}
              defaultStaffId={staffId}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">Date</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={today}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">Time</label>
                <input
                  name="time"
                  type="time"
                  required
                  defaultValue={defaultTime}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">Duration</label>
                <select
                  name="duration"
                  defaultValue="50"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="30">30 minutes</option>
                  <option value="50">50 minutes</option>
                  <option value="80">80 minutes (couples)</option>
                </select>
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-text-2">Type</label>
                <select
                  name="type"
                  defaultValue="individual"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="individual">Individual</option>
                  <option value="couples">Couples</option>
                  <option value="family">Family</option>
                  <option value="intake">Intake</option>
                  <option value="group">Group</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">Location</label>
              <select
                name="locationType"
                defaultValue="telehealth"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="telehealth">Telehealth</option>
                <option value="office">Office</option>
              </select>
            </div>

            <label className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13px] text-foreground">
              <input
                type="checkbox"
                name="autoSendInvoice"
                defaultChecked={!!practice?.auto_send_invoice_default}
                className="h-4 w-4 flex-none accent-brand"
              />
              Automatically send invoice at the end of the appointment
            </label>

            <button
              type="submit"
              className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
            >
              Schedule
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
