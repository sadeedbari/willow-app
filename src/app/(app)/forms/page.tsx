import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadStarterTemplates } from "./actions";
import { resendPendingSignature, cancelPendingSignature } from "./send-form-actions";
import { avatarColorFor, initialsOf } from "@/utils/avatar-color";
import { LiveSearchInput } from "@/components/live-search-input";
import { SendFormModal } from "./send-form-modal";

const TABS = [
  { key: "templates", label: "Form Templates" },
  { key: "pending", label: "Pending Signatures" },
];

function formatSentDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function ConsentTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; send?: string; sent?: string; resent?: string; cancelled?: string; error?: string }>;
}) {
  const { tab, send, sent, resent, cancelled, error } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "templates";
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect("/dashboard");
  }
  const canManageTemplates = staff.role === "practice_admin";

  const supabase = await createClient();

  const [{ data: templates }, { data: pendingForms }] = await Promise.all([
    activeTab === "templates"
      ? supabase.from("consent_form_templates").select("id, title, active, updated_at").order("title")
      : Promise.resolve({ data: null }),
    activeTab === "pending"
      ? supabase
          .from("consent_forms")
          .select("id, form_type, created_at, client_id, clients(full_name, email)")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

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
            className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            + Send Form
          </Link>
          {canManageTemplates && (
            <Link
              href="/forms/new"
              className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
            >
              + New Form
            </Link>
          )}
        </div>
      </div>

      {sent && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          {sent === "1" ? "Form emailed to the client." : "Form created — the client has no email on file, so share the link from their profile instead."}
        </p>
      )}
      {resent && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Signing link re-emailed to the client.
        </p>
      )}
      {cancelled && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Signature request cancelled.
        </p>
      )}
      {error && !send && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
      )}

      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "templates" ? "/forms" : `/forms?tab=${t.key}`}
            className={`-mb-px border-b-2 px-2.5 pb-2 text-[13.4px] font-semibold transition ${
              activeTab === t.key
                ? "border-brand text-foreground"
                : "border-transparent text-text-3 hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {activeTab === "templates" && (
        <>
          {!templates?.length && canManageTemplates && (
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
              const rowClassName =
                "flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition" +
                (canManageTemplates ? " hover:border-brand" : "");
              const rowContent = (
                <>
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
                </>
              );
              return canManageTemplates ? (
                <Link key={t.id} href={`/forms/${t.id}`} data-form-row data-search={t.title.toLowerCase()} className={rowClassName}>
                  {rowContent}
                </Link>
              ) : (
                <div key={t.id} data-form-row data-search={t.title.toLowerCase()} className={rowClassName}>
                  {rowContent}
                </div>
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
        </>
      )}

      {activeTab === "pending" && (
        <div className="space-y-2">
          {pendingForms?.map((f) => {
            const client = f.clients as unknown as { full_name: string; email: string | null } | null;
            const color = avatarColorFor(f.client_id);
            return (
              <div
                key={f.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12.5px] font-bold ${color.bg} ${color.text}`}
                  >
                    {initialsOf(client?.full_name ?? "?")}
                  </span>
                  <div>
                    <div className="text-[13.4px] font-semibold text-foreground">{client?.full_name ?? "Unknown client"}</div>
                    <div className="text-[12px] text-text-3">
                      {f.form_type} · sent {formatSentDate(f.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form action={resendPendingSignature}>
                    <input type="hidden" name="consentFormId" value={f.id} />
                    <button
                      type="submit"
                      disabled={!client?.email}
                      title={client?.email ? undefined : "This client has no email on file"}
                      className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-text-2 transition hover:border-brand hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Resend
                    </button>
                  </form>
                  <form action={cancelPendingSignature}>
                    <input type="hidden" name="consentFormId" value={f.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-bad transition hover:bg-bad-tint"
                    >
                      Cancel request
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {!pendingForms?.length && (
            <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
              No forms awaiting a signature.
            </p>
          )}
        </div>
      )}

      {send && <SendFormModal error={error} />}
    </div>
  );
}
