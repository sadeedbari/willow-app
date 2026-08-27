import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createNote } from "./actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewNotePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; clientId?: string }>;
}) {
  const { error, clientId } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "clinician") {
    redirect("/notes");
  }

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name")
    .eq("assigned_staff_id", staff.id)
    .order("full_name");

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-2xl">
      <Link href="/notes" className="text-[13px] font-semibold text-brand-ink">
        ← Back to notes
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        New session note
      </h1>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <form action={createNote} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Client
            </label>
            <select
              name="clientId"
              required
              defaultValue={clientId ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="" disabled>
                Select a client
              </option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-text-2">
              Session date
            </label>
            <input
              name="sessionDate"
              type="date"
              required
              defaultValue={today}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {[
          { name: "subjective", label: "Subjective", placeholder: "Client-reported experience since last session…" },
          { name: "objective", label: "Objective", placeholder: "Clinician observations — affect, mood, engagement…" },
          { name: "assessment", label: "Assessment", placeholder: "Clinical impression & progress toward goals…" },
          { name: "plan", label: "Plan", placeholder: "Next steps, homework, follow-up interval…" },
        ].map((f) => (
          <div key={f.name}>
            <label className="block text-[12.5px] font-semibold text-text-2">
              {f.label}
            </label>
            <textarea
              name={f.name}
              placeholder={f.placeholder}
              rows={3}
              className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        ))}

        <div className="flex gap-3">
          <button
            type="submit"
            name="intent"
            value="draft"
            className="rounded-lg border border-border px-4 py-2 text-[13.6px] font-semibold text-text-2 transition hover:bg-surface-2"
          >
            Save as draft
          </button>
          <button
            type="submit"
            name="intent"
            value="sign"
            className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Sign & lock note
          </button>
        </div>
      </form>
    </div>
  );
}
