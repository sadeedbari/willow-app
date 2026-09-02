import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";

export default async function NotesPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  if (staff.role !== "clinician" && staff.role !== "practice_admin") {
    return (
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">
          Session Notes
        </h1>
        <p className="mt-3 text-[13.5px] text-text-2">
          Clinical notes aren&apos;t visible to your role. This is enforced by
          the database, not just hidden in the UI — front desk and billing
          staff never receive note content, even via a direct query.
        </p>
      </div>
    );
  }

  // Admins intentionally only ever select metadata columns here — never
  // subjective/objective/assessment/plan — to keep "minimum necessary
  // access" even though the current RLS policy would technically allow
  // an admin to read note content too. See migration 004 for the caveat.
  const columns =
    staff.role === "practice_admin"
      ? "id, session_date, status, clients(full_name), staff(full_name)"
      : "id, session_date, status, subjective, clients(full_name)";

  const { data } = await supabase
    .from("session_notes")
    .select(columns)
    .order("session_date", { ascending: false });

  type Row = {
    id: string;
    session_date: string;
    status: string;
    subjective?: string;
    clients: { full_name: string } | null;
    staff?: { full_name: string } | null;
  };
  const notes = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Session Notes
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {staff.role === "practice_admin"
              ? "Status only — note content stays with the authoring clinician"
              : "Your notes across your caseload"}
          </p>
        </div>
        {staff.role === "clinician" && (
          <Link
            href="/notes/new"
            className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            + New note
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {notes.map((n) => (
          <Link
            key={n.id}
            href={`/notes/${n.id}`}
            className="block rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:bg-surface-2"
          >
            <div className="flex items-center justify-between">
              <div className="text-[13.4px] font-semibold text-foreground">
                {n.clients?.full_name ?? "Unknown client"}
                {n.staff?.full_name && (
                  <span className="ml-2 font-normal text-text-3">
                    · {n.staff.full_name}
                  </span>
                )}
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  n.status === "signed" ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"
                }`}
              >
                {n.status === "signed" ? "Signed" : "Draft"}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-text-3">{n.session_date}</div>
            {n.subjective && (
              <p className="mt-2 line-clamp-2 text-[13px] text-text-2">
                {n.subjective}
              </p>
            )}
          </Link>
        ))}
        {!notes.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No session notes yet.
          </p>
        )}
      </div>
    </div>
  );
}
