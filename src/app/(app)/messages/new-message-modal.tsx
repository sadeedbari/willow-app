import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { startConversation } from "./actions";

export async function NewMessageModal({
  staffId,
  seesAllClients,
}: {
  staffId: string;
  seesAllClients: boolean;
}) {
  const supabase = await createClient();

  let query = supabase.from("clients").select("id, full_name").order("full_name");
  if (!seesAllClients) query = query.eq("assigned_staff_id", staffId);
  const { data: clients } = await query;

  return (
    <>
      <Link href="/messages" aria-label="Close" className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <h2 className="text-[19px] font-bold tracking-tight text-foreground">New Message</h2>
            <Link
              href="/messages"
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-text-2 transition hover:bg-surface-3 hover:text-foreground"
            >
              ×
            </Link>
          </div>

          <form action={startConversation} className="mt-5 space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">Client</label>
              <select
                name="clientId"
                required
                defaultValue=""
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="" disabled>
                  {clients?.length ? "Select a client" : "No clients yet"}
                </option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!clients?.length}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start conversation
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
