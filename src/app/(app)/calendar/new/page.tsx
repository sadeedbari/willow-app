import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createAppointment } from "./actions";
import Link from "next/link";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; clientId?: string }>;
}) {
  const { error, clientId } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: clients }, { data: clinicians }] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name"),
    staff.role === "clinician"
      ? Promise.resolve({ data: null })
      : supabase.from("staff").select("id, full_name").eq("role", "clinician").order("full_name"),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-lg">
      <Link href="/calendar" className="text-[13px] font-semibold text-brand-ink">
        ← Back to calendar
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        New appointment
      </h1>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <form action={createAppointment} className="mt-5 space-y-4">
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

        {clinicians && (
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Clinician
            </label>
            <select
              name="staffId"
              required
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Date
            </label>
            <input
              name="date"
              type="date"
              required
              defaultValue={today}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Time
            </label>
            <input
              name="time"
              type="time"
              required
              defaultValue="14:00"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Duration
            </label>
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
            <label className="block text-[12.5px] font-semibold text-text-2">
              Type
            </label>
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
          <label className="block text-[12.5px] font-semibold text-text-2">
            Location
          </label>
          <select
            name="locationType"
            defaultValue="telehealth"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            <option value="telehealth">Telehealth</option>
            <option value="office">Office</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Schedule
        </button>
      </form>
    </div>
  );
}
