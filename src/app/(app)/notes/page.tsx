import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";

function formatSessionDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const APPOINTMENT_FLAG_LABEL: Record<string, string> = {
  cancelled: "Appointment cancelled",
  no_show: "Appointment no-show",
};
const APPOINTMENT_FLAG_STYLE: Record<string, string> = {
  cancelled: "bg-bad-tint text-bad",
  no_show: "bg-warn-tint text-warn",
};

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

  // Metadata-only RPC -- never returns clinical content except a preview of
  // the caller's OWN notes (safe regardless of role), so front_desk/billing_admin
  // can see the list exists/status here without ever touching content, and a
  // clinician/admin viewing another clinician's note only gets metadata too.
  // Full content for a departed clinician's note is a separate, audited path
  // on the note's own detail page -- not surfaced in this list.
  const { data } = await supabase.rpc("get_practice_notes_overview");

  type Row = {
    id: string;
    session_date: string;
    status: string;
    client_id: string;
    client_full_name: string;
    staff_id: string;
    staff_full_name: string;
    subjective_preview: string | null;
    appointment_status: string | null;
  };
  const allNotes = (data ?? []) as Row[];
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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
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
                  {n.client_full_name ?? "Unknown client"} — {formatSessionDate(n.session_date)}
                  {n.staff_full_name && (
                    <span className="ml-2 font-normal text-text-3">
                      · {n.staff_full_name}
                    </span>
                  )}
                </div>
                <div className="flex flex-none items-center gap-1.5">
                  {n.appointment_status && APPOINTMENT_FLAG_LABEL[n.appointment_status] && (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${APPOINTMENT_FLAG_STYLE[n.appointment_status]}`}
                    >
                      {APPOINTMENT_FLAG_LABEL[n.appointment_status]}
                    </span>
                  )}
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      isUnsigned ? "bg-bad-tint text-bad" : "bg-ok-tint text-ok"
                    }`}
                  >
                    {isUnsigned ? "Unsigned" : "Signed"}
                  </span>
                </div>
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

              {!isUnsigned && n.subjective_preview && (
                <p className="mt-2 line-clamp-2 text-[13px] text-text-2">
                  {n.subjective_preview}
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
