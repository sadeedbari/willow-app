import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sendMessageAsStaff } from "./actions";

export default async function StaffThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { clientId } = await params;
  const { error } = await searchParams;
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

  const { data: messages } = thread
    ? await supabase
        .from("messages")
        .select("id, sender_type, body, created_at, staff(full_name)")
        .eq("thread_id", thread.id)
        .order("created_at")
    : { data: null };

  if (thread) {
    await supabase
      .from("message_threads")
      .update({ staff_last_read_at: new Date().toISOString() })
      .eq("id", thread.id);
  }

  type Row = {
    id: string;
    sender_type: string;
    body: string;
    created_at: string;
    staff: { full_name: string } | null;
  };
  const rows = (messages ?? []) as unknown as Row[];

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col">
      <Link href="/messages" className="text-[13px] font-semibold text-brand-ink">
        ← Back to messages
      </Link>
      <h1 className="mt-3 text-[20px] font-bold tracking-tight text-foreground">
        {client.full_name}
      </h1>
      <p className="text-[12.5px] text-text-3">Secure client messaging</p>

      {error && (
        <p className="mt-3 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
        {rows.length ? (
          rows.map((m) => (
            <div key={m.id} className={`flex ${m.sender_type === "staff" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.6px] ${
                  m.sender_type === "staff"
                    ? "bg-brand text-white"
                    : "border border-border bg-surface text-foreground"
                }`}
              >
                {m.body}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
            No messages yet — send one below to start the conversation.
          </p>
        )}
      </div>

      <form action={sendMessageAsStaff} className="mt-4 flex gap-2">
        <input type="hidden" name="clientId" value={client.id} />
        <input
          name="body"
          required
          placeholder="Write a secure message…"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Send
        </button>
      </form>
    </div>
  );
}
