import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";

function formatSessionDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const TABS = [
  { key: "all", label: "All notes" },
  { key: "unsigned", label: "Due / unsigned" },
  { key: "signed", label: "Signed" },
];

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "all";
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  // "clinician" and "practice_admin" can both author notes -- for a solo
  // practice the owner is always "practice_admin" and IS the treating
  // clinician, so this can't be clinician-only. front_desk/billing_admin
  // never touch clinical content, full stop.
  const canManageNotes = staff.role === "clinician" || staff.role === "practice_admin";

  if (!canManageNotes) {
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

  // Content (subjective preview) is only ever rendered for notes this staff
  // member authored themselves -- an admin who is also seeing another
  // clinician's note (multi-clinician practices, not in scope today) still
  // only gets metadata here, never clinical content, to keep "minimum
  // necessary access" even though RLS would technically allow reading it.
  const { data } = await supabase
    .from("session_notes")
    .select("id, session_date, status, subjective, staff_id, clients(full_name), staff(full_name)")
    .order("session_date", { ascending: false });

  type Row = {
    id: string;
    session_date: string;
    status: string;
    subjective?: string;
    staff_id: string;
    clients: { full_name: string } | null;
    staff?: { full_name: string } | null;
  };
  const allNotes = (data ?? []) as unknown as Row[];
  const notes =
    activeTab === "unsigned"
      ? allNotes.filter((n) => n.status === "draft")
      : activeTab === "signed"
        ? allNotes.filter((n) => n.status === "signed")
        : allNotes;

  const emptyMessage =
    activeTab === "unsigned"
      ? "No unsigned notes."
      : activeTab === "signed"
        ? "No signed notes."
        : "No session notes yet.";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Session Notes
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">Write, sign, and track your clients&apos; session notes</p>
        </div>
        <Link
          href="/notes/new"
          className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
        >
          + New Note
        </Link>
      </div>

      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/notes" : `/notes?tab=${t.key}`}
            className={`-mb-px border-b-2 px-2.5 pb-2 text-[13.4px] font-semibold transition ${
              activeTab === t.key
                ? "border-brand text-foreground"
                : "border-transparent text-text-3 hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {notes.map((n) => {
          const isOwn = n.staff_id === staff.id;
          const isUnsigned = n.status === "draft";
          return (
            <div key={n.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:bg-surface-2">
              <Link href={`/notes/${n.id}`} className="flex items-center justify-between">
                <div className="text-[13.4px] font-semibold text-foreground">
                  {n.clients?.full_name ?? "Unknown client"} — {formatSessionDate(n.session_date)}
                  {n.staff?.full_name && (
                    <span className="ml-2 font-normal text-text-3">
                      · {n.staff.full_name}
                    </span>
                  )}
                </div>
                <span
                  className={`inline-flex flex-none rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    isUnsigned ? "bg-bad-tint text-bad" : "bg-ok-tint text-ok"
                  }`}
                >
                  {isUnsigned ? "Unsigned" : "Signed"}
                </span>
              </Link>

              {isUnsigned && isOwn && (
                <>
                  <p className="mt-2 text-[13px] text-text-2">
                    This session note is still in draft — sign to lock it into the record.
                  </p>
                  <Link
                    href={`/notes/${n.id}/edit`}
                    className="mt-3 inline-flex rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-ink"
                  >
                    Complete note
                  </Link>
                </>
              )}

              {!isUnsigned && isOwn && n.subjective && (
                <p className="mt-2 line-clamp-2 text-[13px] text-text-2">
                  {n.subjective}
                </p>
              )}
            </div>
          );
        })}
        {!notes.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
