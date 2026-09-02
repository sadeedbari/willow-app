import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { updateNote } from "../actions";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const RISK_OPTIONS = [
  { value: "none", label: "None identified" },
  { value: "passive_ideation", label: "Passive ideation" },
  { value: "active_ideation", label: "Active ideation" },
  { value: "immediate_risk", label: "Immediate risk" },
];

export default async function EditNotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const staff = await getCurrentStaff();

  // "clinician" and "practice_admin" can both author notes -- see /notes/new
  // for why this can't be clinician-only.
  if (staff.role !== "clinician" && staff.role !== "practice_admin") {
    redirect(`/notes/${id}`);
  }

  const supabase = await createClient();
  const { data: note } = await supabase
    .from("session_notes")
    .select("id, session_date, status, subjective, objective, assessment, plan, risk_level, risk_notes, staff_id, clients(full_name)")
    .eq("id", id)
    .single();

  if (!note) notFound();

  // Only the authoring clinician can edit their own note -- an admin who can
  // see another clinician's row via the practice-wide policy (multi-clinician
  // practices, not in scope today) still can't open it for editing.
  if (note.staff_id !== staff.id) {
    redirect(`/notes/${id}`);
  }

  // Signed notes are immutable at the database level (RLS blocks the
  // update outright) -- redirect here too so the form never renders
  // for something that can't actually be saved.
  if (note.status !== "draft") {
    redirect(`/notes/${id}?error=${encodeURIComponent("This note is signed and locked — add an addendum instead of editing it.")}`);
  }

  const client = note.clients as unknown as { full_name: string } | null;

  return (
    <div className="max-w-2xl">
      <Link href={`/notes/${id}`} className="text-[13px] font-semibold text-brand-ink">
        ← Back to note
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        Edit draft — {client?.full_name ?? "Unknown client"}
      </h1>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <form action={updateNote} className="mt-5 space-y-4">
        <input type="hidden" name="noteId" value={note.id} />
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">Session date</label>
          <input
            name="sessionDate"
            type="date"
            required
            defaultValue={note.session_date}
            className="mt-1 w-56 rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        {[
          { name: "subjective", label: "Subjective", value: note.subjective },
          { name: "objective", label: "Objective", value: note.objective },
          { name: "assessment", label: "Assessment", value: note.assessment },
          { name: "plan", label: "Plan", value: note.plan },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-[12.5px] font-semibold text-text-2">
              {f.label}
            </label>
            <textarea
              name={f.name}
              defaultValue={f.value ?? ""}
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
            defaultValue={note.risk_level ?? "none"}
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
            defaultValue={note.risk_notes ?? ""}
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
            Save draft
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
