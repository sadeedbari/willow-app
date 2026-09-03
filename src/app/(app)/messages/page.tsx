import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getThreadList } from "./data";
import { ThreadList } from "./thread-list";
import { MessagesFrame } from "./messages-frame";
import { NewMessageModal } from "./new-message-modal";

export default async function MessagesInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: showNew } = await searchParams;
  const staff = await getCurrentStaff();

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

  const supabase = await createClient();
  const threads = await getThreadList(supabase);

  if (threads.length) {
    redirect(`/messages/${threads[0].client_id}${showNew ? "?new=1" : ""}`);
  }

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

      <MessagesFrame
        left={<ThreadList threads={threads} />}
        right={
          <p className="m-auto max-w-xs text-center text-[13px] text-text-3">
            No conversations yet. Click + New Message to start one.
          </p>
        }
      />

      {showNew && (
        <NewMessageModal
          staffId={staff.id}
          seesAllClients={staff.role === "practice_admin" || staff.role === "front_desk"}
        />
      )}
    </div>
  );
}
