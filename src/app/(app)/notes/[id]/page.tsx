import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { notFound } from "next/navigation";
import { signNote, addAddendum } from "./actions";

const RISK_LABEL: Record<string, string> = {
  none: "None identified",
  passive_ideation: "Passive ideation",
  active_ideation: "Active ideation",
  immediate_risk: "Immediate risk",
};

const RISK_STYLE: Record<string, string> = {
  none: "bg-ok-tint text-ok",
  passive_ideation: "bg-warn-tint text-warn",
  active_ideation: "bg-warn-tint text-warn",
  immediate_risk: "bg-bad-tint text-bad",
};

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  couples: "Couples",
  family: "Family",
  intake: "Intake",
  group: "Group",
};

export default async function NoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  // "clinician" and "practice_admin" can both author notes -- for a solo
  // practice the owner is always "practice_admin" and IS the treating
  // clinician. front_desk/billing_admin never touch clinical content, full
  // stop, so they get metadata columns only. A clinician/admin viewing a
  // note authored by someone else (multi-clinician practices, not in scope
  // today) also only gets metadata -- content is gated by authorship below,
  // not by role, to keep "minimum necessary access" even though RLS would
  // technically allow an admin to read another clinician's note content.
  const canManageNotes = staff.role === "clinician" || staff.role === "practice_admin";
  const columns = canManageNotes
    ? "id, session_date, status, subjective, objective, assessment, plan, risk_level, risk_notes, signed_at, client_id, staff_id, appointment_id, clients(full_name), staff(full_name), appointments(type, starts_at, ends_at)"
    : "id, session_date, status, client_id, clients(full_name), staff(full_name)";

  const { data } = await supabase.from("session_notes").select(columns).eq("id", id).single();

  if (!data) notFound();

  type Note = {
    id: string;
    session_date: string;
    status: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    risk_level?: string;
    risk_notes?: string | null;
    signed_at?: string | null;
    client_id: string;
    staff_id?: string;
    appointment_id?: string | null;
    clients: { full_name: string } | null;
    staff?: { full_name: string } | null;
    appointments?: { type: string; starts_at: string; ends_at: string } | null;
  };
  const note = data as unknown as Note;
  const canSeeContent = canManageNotes && note.staff_id === staff.id;

  const addenda = canSeeContent
    ? (
        await supabase
          .from("session_note_addenda")
          .select("id, content, created_at")
          .eq("note_id", id)
          .order("created_at", { ascending: true })
      ).data
    : null;

  const appt = note.appointments;
  const durationMinutes = appt
    ? Math.round((new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) / 60000)
    : null;

  return (
    <div className="max-w-2xl">
      <Link href="/notes" className="text-[13px] font-semibold text-brand-ink">
        ← Back to notes
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            {note.clients?.full_name ?? "Unknown client"}
          </h1>
          <p className="mt-1 text-[13px] text-text-2">
            {note.session_date}
            {appt && ` · ${TYPE_LABEL[appt.type] ?? appt.type} · ${durationMinutes} min`}
            {note.staff?.full_name && ` · ${note.staff.full_name}`}
          </p>
        </div>
        <span
          className={`inline-flex flex-none rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${
            note.status === "signed" ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"
          }`}
        >
          {note.status === "signed" ? "Signed" : "Draft"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-3">
        <Link href={`/clients/${note.client_id}?tab=notes`} className="text-[12.5px] font-semibold text-brand-ink">
          View client
        </Link>
        {canSeeContent && note.status === "draft" && (
          <Link href={`/notes/${note.id}/edit`} className="text-[12.5px] font-semibold text-brand-ink">
            Edit draft
          </Link>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}

      {!canSeeContent ? (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-5 text-[13px] text-text-3">
          Session note content isn&apos;t visible to your role. This is enforced by the database, not just hidden in the UI.
        </p>
      ) : (
        <>
          <div className="mt-5 space-y-4">
            {[
              { label: "Subjective", value: note.subjective },
              { label: "Objective", value: note.objective },
              { label: "Assessment", value: note.assessment },
              { label: "Plan", value: note.plan },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="text-[12px] font-bold uppercase tracking-wide text-text-3">{f.label}</div>
                <p className="mt-1.5 whitespace-pre-wrap text-[13.6px] text-foreground">{f.value || "—"}</p>
              </div>
            ))}

            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-bold uppercase tracking-wide text-text-3">Risk assessment</div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    RISK_STYLE[note.risk_level ?? "none"]
                  }`}
                >
                  {RISK_LABEL[note.risk_level ?? "none"]}
                </span>
              </div>
              {note.risk_notes && (
                <p className="mt-1.5 whitespace-pre-wrap text-[13.6px] text-foreground">{note.risk_notes}</p>
              )}
            </div>
          </div>

          {note.status === "draft" ? (
            <form action={signNote} className="mt-5">
              <input type="hidden" name="noteId" value={note.id} />
              <button
                type="submit"
                className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
              >
                Sign & lock note
              </button>
            </form>
          ) : (
            <p className="mt-5 text-[12px] text-text-3">
              Signed{note.signed_at && ` ${new Date(note.signed_at).toLocaleString()}`} — locked from editing.
              Corrections are added below as a dated addendum.
            </p>
          )}

          <div className="mt-6">
            <div className="text-[13px] font-bold text-foreground">Addenda</div>
            {addenda?.length ? (
              <ul className="mt-2 space-y-3">
                {addenda.map((a) => (
                  <li key={a.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                    <div className="text-[11.5px] font-semibold text-text-3">
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[13.4px] text-foreground">{a.content}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-text-3">No addenda.</p>
            )}

            <form action={addAddendum} className="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <input type="hidden" name="noteId" value={note.id} />
              <label className="block text-[12.5px] font-semibold text-text-2">Add addendum</label>
              <textarea
                name="content"
                required
                rows={3}
                placeholder="Corrections or updates to this note — this is appended with a timestamp, the original note is never changed."
                className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <button
                type="submit"
                className="mt-3 rounded-lg border border-border px-3.5 py-2 text-[13px] font-semibold text-text-2 transition hover:bg-surface-2"
              >
                Add addendum
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
