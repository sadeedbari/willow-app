import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getThreadList } from "../data";
import { ThreadList } from "../thread-list";
import { MessagesFrame } from "../messages-frame";
import { ThreadDetail } from "../thread-detail";
import { NewMessageModal } from "../new-message-modal";

export default async function StaffThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ error?: string; new?: string }>;
}) {
  const { clientId } = await params;
  const { error, new: showNew } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin" && staff.role !== "clinician" && staff.role !== "front_desk") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, assigned_staff_id")
    .eq("id", clientId)
    .single();

  if (!client) notFound();
  if (staff.role === "clinician" && client.assigned_staff_id !== staff.id) {
    redirect("/messages");
  }

  const { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("client_id", clientId)
    .maybeSingle();

  const [{ data: messages }, threads] = await Promise.all([
    thread
      ? supabase
          .from("messages")
          .select("id, sender_type, body, created_at")
          .eq("thread_id", thread.id)
          .order("created_at")
      : Promise.resolve({ data: null }),
    getThreadList(supabase),
  ]);

  if (thread) {
    await supabase
      .from("message_threads")
      .update({ staff_last_read_at: new Date().toISOString() })
      .eq("id", thread.id);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">Messages</h1>
          <p className="mt-1 text-[13.5px] text-text-2">Secure messaging with clients.</p>
        </div>
        <Link
          href={`/messages/${clientId}?new=1`}
          className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
        >
          + New Message
        </Link>
      </div>

      <MessagesFrame
        mobileView="detail"
        left={<ThreadList threads={threads} activeClientId={clientId} />}
        right={<ThreadDetail client={client} messages={messages ?? []} error={error} />}
      />

      {showNew && (
        <NewMessageModal
          staffId={staff.id}
          seesAllClients={staff.role === "practice_admin" || staff.role === "front_desk"}
          closeHref={`/messages/${clientId}`}
        />
      )}
    </div>
  );
}
