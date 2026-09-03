import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { NewMessageModal } from "./new-message-modal";
import { isThreadUnread } from "@/utils/messaging";

export default async function MessagesInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: showNew } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  if (staff.role !== "practice_admin" && staff.role !== "clinician" && staff.role !== "front_desk") {
    return (
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Messages</h1>
        <p className="mt-3 text-[13.5px] text-text-2">
          Client messaging isn&apos;t visible to your role. This is enforced by the database,
          not just hidden in the UI.
        </p>
      </div>
    );
  }

  const { data: threads } = await supabase
    .from("message_threads")
    .select("id, client_id, staff_last_read_at, updated_at, clients(full_name)")
    .order("updated_at", { ascending: false });

  type Row = {
    id: string;
    client_id: string;
    staff_last_read_at: string | null;
    updated_at: string;
    clients: { full_name: string } | null;
  };
  const rows = (threads ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">Messages</h1>
          <p className="mt-1 text-[13.5px] text-text-2">Secure messaging with clients.</p>
        </div>
        <Link
          href="/messages?new=1"
          className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
        >
          + New Message
        </Link>
      </div>

      <div className="mt-6 space-y-2">
        {rows.map((t) => {
          const unread = isThreadUnread(t.staff_last_read_at, t.updated_at);
          return (
            <Link
              key={t.id}
              href={`/messages/${t.client_id}`}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand"
            >
              <div className="flex items-center gap-3">
                {unread && <span className="h-2 w-2 flex-none rounded-full bg-brand" />}
                <span className={`text-[13.6px] ${unread ? "font-bold" : "font-semibold"} text-foreground`}>
                  {t.clients?.full_name ?? "Unknown client"}
                </span>
              </div>
              <span className="text-[11.5px] text-text-3">
                {new Date(t.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </Link>
          );
        })}
        {!rows.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No conversations yet. Click + New Message to start one.
          </p>
        )}
      </div>

      {showNew && (
        <NewMessageModal
          staffId={staff.id}
          seesAllClients={staff.role === "practice_admin" || staff.role === "front_desk"}
        />
      )}
    </div>
  );
}
