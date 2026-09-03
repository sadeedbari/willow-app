import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { sendFormToClient } from "./send-form-actions";

export async function SendFormModal({ error }: { error?: string }) {
  const supabase = await createClient();

  const [{ data: clients }, { data: templates }] = await Promise.all([
    supabase.from("clients").select("id, full_name").order("full_name"),
    supabase.from("consent_form_templates").select("id, title").eq("active", true).order("title"),
  ]);

  return (
    <>
      <Link href="/forms" aria-label="Close" className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <h2 className="text-[19px] font-bold tracking-tight text-foreground">Send Form</h2>
            <Link
              href="/forms"
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-text-2 transition hover:bg-surface-3 hover:text-foreground"
            >
              ×
            </Link>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
              {decodeURIComponent(error)}
            </p>
          )}

          <form action={sendFormToClient} className="mt-5 space-y-4">
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
            <div>
              <label className="block text-[12.5px] font-semibold text-text-2">Form</label>
              <select
                name="templateId"
                required
                defaultValue=""
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="" disabled>
                  {templates?.length ? "Select a form" : "No active forms — add one first"}
                </option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!clients?.length || !templates?.length}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
