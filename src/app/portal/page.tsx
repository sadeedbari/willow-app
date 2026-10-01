import { createClient } from "@/utils/supabase/server";
import { getCurrentClient } from "@/utils/supabase/current-client";
import { sendMessageAsClient } from "./actions";
import { PortalTabs } from "./tabs";
import { PortalHeader } from "./portal-header";

export default async function PortalPage() {
  const client = await getCurrentClient();
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("client_id", client.id)
    .maybeSingle();

  const { data: messages } = thread
    ? await supabase
        .from("messages")
        .select("id, sender_type, body, created_at")
        .eq("thread_id", thread.id)
        .order("created_at")
    : { data: null };

  if (thread) {
    await supabase
      .from("message_threads")
      .update({ client_last_read_at: new Date().toISOString() })
      .eq("id", thread.id);
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <PortalHeader practiceName={client.practiceName} practiceLogoUrl={client.practiceLogoUrl} clientFullName={client.fullName} />

      <div className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-4 py-6">
        <PortalTabs active="/portal" />

        <h1 className="mt-4 text-[18px] font-bold tracking-tight text-foreground">Messages</h1>
        <p className="mt-1 text-[12.5px] text-text-3">Secure messaging with your practice.</p>

        <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
          {messages?.length ? (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_type === "client" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.6px] ${
                    m.sender_type === "client"
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

        <form action={sendMessageAsClient} className="mt-4 flex gap-2">
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
    </div>
  );
}
