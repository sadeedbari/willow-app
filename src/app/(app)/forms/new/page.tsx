import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createTemplate } from "./actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewConsentTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/forms");
  }

  return (
    <div className="max-w-2xl">
      <Link href="/forms" className="text-[13px] font-semibold text-brand-ink">
        ← Back to templates
      </Link>
      <h1 className="mt-3 text-[22px] font-bold tracking-tight text-foreground">
        New consent template
      </h1>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      )}

      <form action={createTemplate} className="mt-5 space-y-4">
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">
            Title
          </label>
          <input
            name="title"
            required
            placeholder="e.g. Consent to Group Therapy"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13.6px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-[12.5px] font-semibold text-text-2">
            Form text
          </label>
          <textarea
            name="body"
            required
            rows={14}
            placeholder="What the client is agreeing to…"
            className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13.4px] leading-relaxed outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-[13.6px] font-semibold text-white transition hover:bg-brand-ink"
        >
          Create template
        </button>
      </form>
    </div>
  );
}
