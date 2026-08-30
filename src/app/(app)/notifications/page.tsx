import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { openNotification, markAllNotificationsRead } from "./actions";

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function NotificationsPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("staff_id", staff.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-[12.5px] font-semibold text-brand-ink">
              Mark all read
            </button>
          </form>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((n) => (
          <form key={n.id} action={openNotification}>
            <input type="hidden" name="id" value={n.id} />
            <input type="hidden" name="link" value={n.link ?? ""} />
            <button
              type="submit"
              className={`flex w-full items-start justify-between gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:border-brand ${
                n.read_at ? "border-border bg-surface" : "border-brand-tint bg-brand-tint/40"
              }`}
            >
              <div className="min-w-0">
                <div className={`text-[13.4px] ${n.read_at ? "font-medium text-foreground" : "font-bold text-foreground"}`}>
                  {n.title}
                </div>
                {n.body && <div className="mt-0.5 truncate text-[12.5px] text-text-2">{n.body}</div>}
              </div>
              <div className="flex flex-none items-center gap-2">
                {!n.read_at && <span className="h-2 w-2 rounded-full bg-brand" />}
                <span className="text-[11.5px] text-text-3">{timeAgo(n.created_at)}</span>
              </div>
            </button>
          </form>
        ))}
        {!notifications.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No notifications yet.
          </p>
        )}
      </div>
    </div>
  );
}
