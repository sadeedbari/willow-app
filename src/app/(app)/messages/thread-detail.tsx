import Link from "next/link";
import { avatarColorFor, initialsOf } from "@/utils/avatar-color";
import { sendMessageAsStaff } from "./[clientId]/actions";

type MessageRow = {
  id: string;
  sender_type: string;
  body: string;
  created_at: string;
};

export function ThreadDetail({
  client,
  messages,
  error,
}: {
  client: { id: string; full_name: string };
  messages: MessageRow[];
  error?: string;
}) {
  const color = avatarColorFor(client.id);

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-border px-4.5 py-3.5">
        <Link
          href="/messages?view=inbox"
          aria-label="Back to inbox"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-text-2 transition hover:bg-surface-2 sm:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="m15 6-6 6 6 6" />
          </svg>
        </Link>
        <span
          className={`flex h-8.5 w-8.5 flex-none items-center justify-center rounded-full text-[11.5px] font-bold ${color.bg} ${color.text}`}
        >
          {initialsOf(client.full_name)}
        </span>
        <div>
          <div className="text-[13.8px] font-bold text-foreground">{client.full_name}</div>
          <div className="text-[11.5px] text-text-3">Secure client messaging</div>
        </div>
      </div>

      {error && (
        <p className="mx-4.5 mt-3 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}

      <div className="flex-1 space-y-2.5 overflow-y-auto p-4.5">
        {messages.length ? (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.sender_type === "staff" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[62%] px-3.5 py-2 text-[13.3px] leading-relaxed ${
                  m.sender_type === "staff"
                    ? "rounded-2xl rounded-br-[5px] bg-brand text-white"
                    : "rounded-2xl rounded-bl-[5px] bg-surface-2 text-foreground"
                }`}
              >
                {m.body}
              </div>
              <div className="mt-0.5 text-[10.5px] text-text-3">
                {new Date(m.created_at).toLocaleDateString(undefined, { weekday: "short" })}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-text-3">
            No messages yet — send one below to start the conversation.
          </p>
        )}
      </div>

      <form action={sendMessageAsStaff} className="flex gap-2.5 border-t border-border px-4 py-3">
        <input type="hidden" name="clientId" value={client.id} />
        <input
          name="body"
          required
          placeholder="Write a secure message…"
          className="flex-1 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-[13.4px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand text-white transition hover:bg-brand-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4Z" />
          </svg>
        </button>
      </form>
    </>
  );
}
