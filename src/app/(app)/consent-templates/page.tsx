import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadStarterTemplates } from "./actions";

export default async function ConsentTemplatesPage() {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("consent_form_templates")
    .select("id, title, active, updated_at")
    .order("title");

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Forms
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">Manage Practice Forms</p>
        </div>
        <Link
          href="/consent-templates/new"
          className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
        >
          + New Form
        </Link>
      </div>

      {!templates?.length && (
        <form action={loadStarterTemplates} className="mb-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="text-[13px] font-bold text-foreground">Start with common templates</div>
          <p className="mt-1 text-[12.5px] text-text-2">
            Adds informed consent, AI note-taking, telehealth, cancellation policy, and privacy
            practices templates — starting points only, review with your regulatory college or
            legal counsel before use.
          </p>
          <button
            type="submit"
            className="mt-3 rounded-lg border border-border px-3.5 py-2 text-[13px] font-semibold text-text-2 transition hover:bg-surface-2"
          >
            Load starter templates
          </button>
        </form>
      )}

      <div className="space-y-2">
        {templates?.map((t) => (
          <Link
            key={t.id}
            href={`/consent-templates/${t.id}`}
            className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand"
          >
            <div className="text-[13.4px] font-semibold text-foreground">{t.title}</div>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                t.active ? "bg-ok-tint text-ok" : "bg-surface-2 text-text-3"
              }`}
            >
              {t.active ? "Active" : "Inactive"}
            </span>
          </Link>
        ))}
        {!templates?.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No templates yet.
          </p>
        )}
      </div>
    </div>
  );
}
