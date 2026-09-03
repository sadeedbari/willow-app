import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadStarterTemplates } from "./actions";
import { avatarColorFor } from "@/utils/avatar-color";
import { LiveSearchInput } from "@/components/live-search-input";
import { SendFormModal } from "./send-form-modal";

export default async function ConsentTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ send?: string; sent?: string; error?: string }>;
}) {
  const { send, sent, error } = await searchParams;
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
        <div className="flex gap-2">
          <Link
            href="/forms?send=1"
            className="rounded-lg border border-border px-3.5 py-2 text-[13.4px] font-semibold text-text-2 transition hover:border-brand hover:text-brand-ink"
          >
            + Send Form
          </Link>
          <Link
            href="/forms/new"
            className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            + New Form
          </Link>
        </div>
      </div>

      {sent && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          {sent === "1" ? "Form emailed to the client." : "Form created — the client has no email on file, so share the link from their profile instead."}
        </p>
      )}
      {error && !send && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}

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

      {!!templates?.length && (
        <div className="mb-4">
          <LiveSearchInput placeholder="Search forms…" itemSelector="[data-form-row]" emptyStateSelector="[data-no-search-results]" />
        </div>
      )}

      <div className="space-y-2">
        {templates?.map((t) => {
          const color = avatarColorFor(t.id);
          return (
            <Link
              key={t.id}
              href={`/forms/${t.id}`}
              data-form-row
              data-search={t.title.toLowerCase()}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${color.bg} ${color.text}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                    <path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                    <path d="M9 12h6M9 16h6M9 8h3" />
                  </svg>
                </span>
                <div className="text-[13.4px] font-semibold text-foreground">{t.title}</div>
              </div>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  t.active ? "bg-ok-tint text-ok" : "bg-surface-2 text-text-3"
                }`}
              >
                {t.active ? "Active" : "Inactive"}
              </span>
            </Link>
          );
        })}
        {!!templates?.length && (
          <p data-no-search-results style={{ display: "none" }} className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No forms match your search.
          </p>
        )}
        {!templates?.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No templates yet.
          </p>
        )}
      </div>

      {send && <SendFormModal error={error} />}
    </div>
  );
}
