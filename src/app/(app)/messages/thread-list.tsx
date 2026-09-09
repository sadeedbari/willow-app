import Link from "next/link";
import { avatarColorFor, initialsOf } from "@/utils/avatar-color";
import { isThreadUnread } from "@/utils/messaging";
import type { ThreadListRow } from "./data";

export function ThreadList({ threads, activeClientId }: { threads: ThreadListRow[]; activeClientId?: string }) {
  return (
    <div className="w-full overflow-y-auto border-r border-border sm:w-[280px] sm:flex-none">
      {threads.map((t) => {
        const unread = isThreadUnread(t.staff_last_read_at, t.updated_at);
        const active = t.client_id === activeClientId;
        const color = avatarColorFor(t.client_id);
        return (
          <Link
            key={t.id}
            href={`/messages/${t.client_id}`}
            className={`flex items-start gap-2.5 border-b border-border px-3.5 py-3 transition ${
              active ? "bg-brand-tint" : "hover:bg-surface-2"
            }`}
          >
            <span
              className={`flex h-8.5 w-8.5 flex-none items-center justify-center rounded-full text-[11.5px] font-bold ${color.bg} ${color.text}`}
            >
              {initialsOf(t.clients?.full_name ?? "?")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className={`truncate text-[13px] ${unread ? "font-bold" : "font-semibold"} text-foreground`}>
                  {t.clients?.full_name ?? "Unknown client"}
                </span>
                {unread && <span className="mt-0.5 h-[7px] w-[7px] flex-none rounded-full bg-brand" />}
              </div>
              <div className="truncate text-[12px] text-text-3">{t.preview}</div>
            </div>
          </Link>
        );
      })}
      {!threads.length && (
        <p className="p-6 text-center text-[13px] text-text-3">Nothing here yet.</p>
      )}
    </div>
  );
}
