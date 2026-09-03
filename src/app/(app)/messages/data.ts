import type { SupabaseClient } from "@supabase/supabase-js";

export type ThreadListRow = {
  id: string;
  client_id: string;
  staff_last_read_at: string | null;
  updated_at: string;
  clients: { full_name: string } | null;
  preview: string;
};

// Shared by the bare inbox ("/messages") and an open thread
// ("/messages/[clientId]") -- both render the same left-hand thread list,
// just with a different (or no) thread marked active on the right.
export async function getThreadList(supabase: SupabaseClient): Promise<ThreadListRow[]> {
  const { data: threads } = await supabase
    .from("message_threads")
    .select("id, client_id, staff_last_read_at, updated_at, clients(full_name)")
    .order("updated_at", { ascending: false });

  const rows = (threads ?? []) as unknown as Omit<ThreadListRow, "preview">[];
  if (!rows.length) return [];

  const { data: recentMessages } = await supabase
    .from("messages")
    .select("thread_id, body")
    .in("thread_id", rows.map((t) => t.id))
    .order("created_at", { ascending: false });

  const previewByThread = new Map<string, string>();
  for (const m of recentMessages ?? []) {
    if (!previewByThread.has(m.thread_id)) previewByThread.set(m.thread_id, m.body);
  }

  return rows.map((t) => ({ ...t, preview: previewByThread.get(t.id) ?? "" }));
}
