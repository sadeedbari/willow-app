import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createNote } from "./actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DISPLAY_TIME_ZONE } from "@/utils/timezone";

const RISK_OPTIONS = [
  { value: "none", label: "None identified" },
  { value: "passive_ideation", label: "Passive ideation" },
  { value: "active_ideation", label: "Active ideation" },
  { value: "immediate_risk", label: "Immediate risk" },
];

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  couples: "Couples",
  family: "Family",
  intake: "Intake",
  group: "Group",
};

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; clientId?: string; appointmentId?: string }>;
}) {
  const { error, clientId, appointmentId } = await searchParams;
  const staff = await getCurrentStaff();

  // "clinician" and "practice_admin" can both author notes -- for a solo
  // practice the owner is always "practice_admin" and IS the treating
  // clinician, so this can't be clinician-only.
  if (staff.role !== "clinician" && staff.role !== "practice_admin") {
    redirect("/notes");
  }

  const supabase = await createClient();

  const appointment = appointmentId
    ? (
        await supabase
          .from("appointments")
          .select("id, starts_at, type, client_id, staff_id, clients(full_name)")
          .eq("id", appointmentId)
          .single()
      ).data
    : null;

  // An appointment link only pins the client/date if it's actually this
  // clinician's own appointment -- otherwise fall through to the normal
  // client picker rather than silently trusting an arbitrary query param.
  const lockedClient =
    appointment && appointment.staff_id === staff.id
      ? { id: appointment.client_id, name: (appointment.clients as unknown as { full_name: string } | null)?.full_name }
      : null;

  // Includes unassigned clients, not just ones explicitly assigned to this
  // staff member -- a solo practice's owner is always "practice_admin" and
  // often never bothers assigning their own clients to themselves, since
  // there's no one else it could be.
  const { data: clients } = lockedClient
    ? { data: null }
    : await supabase
        .from("clients")
        .select("id, full_name")
        .or(`assigned_staff_id.eq.${staff.id},assigned_staff_id.is.null`)
        .order("full_name");

  const today = new Date().toISOString().slice(0, 10);
  const sessionDate = lockedClient ? appointment!.starts_at.slice(0, 10) : today;

  return (
    <div className="max-w-2xl">
      <Link href="/notes" className="text-[13px] font-semibold text-brand-ink">
        ← Back to notes
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        New session note
      </h1>
      {lockedClient && (
        <p className="mt-1 text-[12.5px] text-text-2">
          For the {TYPE_LABEL[appointment!.type] ?? appointment!.type} appointment on{" "}
          {new Date(appointment!.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: DISPLAY_TIME_ZONE })}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <form action={createNote} className="mt-5 space-y-4">
        {appointmentId && <input type="hidden" name="appointmentId" value={appointmentId} />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Client
            </label>
            {lockedClient ? (
              <div className="mt-1 flex items-center rounded-lg border border-border bg-surface-2 px-3 py-2 text-[13.6px] text-foreground">
                <input type="hidden" name="clientId" value={lockedClient.id} />
                {lockedClient.name ?? "Unknown client"}
              </div>
            ) : (
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
            )}
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Session date
            </label>
            <input
              name="sessionDate"
              type="date"
              required
              defaultValue={sessionDate}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {[
          { name: "subjective", label: "Subjective", placeholder: "Client-reported experience since last session…" },
          { name: "objective", label: "Objective", placeholder: "Clinician observations — affect, mood, engagement…" },
          { name: "assessment", label: "Assessment", placeholder: "Clinical impression & progress toward goals…" },
          { name: "plan", label: "Plan", placeholder: "Next steps, homework, follow-up interval…" },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-[12.5px] font-semibold text-text-2">
              {f.label}
            </label>
            <textarea
              name={f.name}
              placeholder={f.placeholder}
              rows={3}
              className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        ))}

        <div className="rounded-lg border border-border bg-surface-2 p-3.5">
          <label className="block text-[12.5px] font-semibold text-text-2">
            Risk assessment
          </label>
          <select
            name="riskLevel"
            defaultValue="none"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          >
            {RISK_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <label className="mt-3 block text-[12.5px] font-semibold text-text-2">
            Risk details / safety plan
          </label>
          <textarea
            name="riskNotes"
            placeholder="Required unless risk assessment is “None identified” — describe what was assessed and any safety plan put in place."
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            name="intent"
            value="draft"
            className="rounded-lg border border-border px-4 py-2 text-[13.6px] font-semibold text-text-2 transition hover:bg-surface-2"
          >
            Save as draft
          </button>
          <button
            type="submit"
            name="intent"
            value="sign"
            className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Sign & lock note
          </button>
        </div>
      </form>
    </div>
  );
}
