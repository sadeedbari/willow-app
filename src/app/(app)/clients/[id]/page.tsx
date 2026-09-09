import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sendConsentForm } from "./consent-actions";
import { inviteToPortal, resendPortalInvite } from "./portal-actions";
import { avatarColorFor, initialsOf } from "@/utils/avatar-color";
import { EditClientModal } from "./edit-client-modal";
import { uploadClientDocument, deleteClientDocument } from "./documents-actions";
import { removeSavedCard } from "./card-actions";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  on_hold: "On hold",
  discharged: "Discharged",
  waitlisted: "Waitlisted",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-ok-tint text-ok",
  on_hold: "bg-warn-tint text-warn",
  discharged: "bg-surface-2 text-text-2",
  waitlisted: "bg-hue-cal-tint text-hue-cal",
};

const CONSENT_STATUS_STYLE: Record<string, string> = {
  pending: "bg-warn-tint text-warn",
  signed: "bg-ok-tint text-ok",
  expired: "bg-bad-tint text-bad",
  cancelled: "bg-surface-2 text-text-3",
};

const CONSENT_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting signature",
  signed: "Signed",
  expired: "Expired",
  cancelled: "Cancelled",
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "notes", label: "Session Notes" },
  { key: "consent", label: "Consent Forms" },
  { key: "billing", label: "Billing" },
  { key: "documents", label: "Documents" },
];

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string; invited?: string; consentToken?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { tab, error, invited, consentToken, edit } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "overview";

  const { data: allClients } = await supabase
    .from("clients")
    .select("id, full_name, presenting_concern")
    .order("full_name");

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, full_name, date_of_birth, phone, email, presenting_concern, status, payer, balance_cents, assigned_staff_id, portal_user_id, default_appointment_type, session_frequency, created_at, stripe_card_brand, stripe_card_last4, staff:assigned_staff_id(full_name)"
    )
    .eq("id", id)
    .single();

  if (!client) notFound();

  const clinician = client.staff as unknown as { full_name: string } | null;

  // Unassigned counts as "own" too -- a solo practice's clients are often
  // never explicitly assigned since there's only one possible clinician.
  const isOwnClient = client.assigned_staff_id === staff.id || client.assigned_staff_id === null;
  // "clinician" and "practice_admin" can both author notes -- see
  // /notes/new for why this can't be clinician-only.
  const canSeeNotes = (staff.role === "clinician" || staff.role === "practice_admin") && isOwnClient;
  const canManageInvoices = staff.role === "practice_admin" || staff.role === "billing_admin";
  const canSendConsent = staff.role === "practice_admin" || staff.role === "front_desk";
  const canInviteToPortal = staff.role === "practice_admin" || staff.role === "front_desk";
  const canMessage = staff.role === "practice_admin" || (staff.role === "clinician" && isOwnClient);
  const canEdit = staff.role === "practice_admin" || staff.role === "front_desk";
  const canUploadDocuments =
    staff.role === "practice_admin" || staff.role === "front_desk" || (staff.role === "clinician" && isOwnClient);
  const canDeleteDocuments = staff.role === "practice_admin";

  const [{ data: notes }, { data: invoices }, { data: consentForms }, { data: templates }, { data: upcoming }, { data: documents }] =
    await Promise.all([
      canSeeNotes
        ? supabase
            .from("session_notes")
            .select("id, session_date, status, subjective")
            .eq("client_id", id)
            .order("session_date", { ascending: false })
        : Promise.resolve({ data: null }),
      supabase
        .from("invoices")
        .select("id, invoice_number, status, total_cents, amount_paid_cents, issue_date")
        .eq("client_id", id)
        .order("issue_date", { ascending: false }),
      supabase
        .from("consent_forms")
        .select("id, form_type, status, signed_at, access_token")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      canSendConsent
        ? supabase.from("consent_form_templates").select("id, title").eq("active", true).order("title")
        : Promise.resolve({ data: null }),
      supabase
        .from("appointments")
        .select("id, starts_at, type")
        .eq("client_id", id)
        .eq("status", "scheduled")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(5),
      supabase
        .from("client_documents")
        .select("id, file_name, file_size_bytes, content_type, created_at")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const sentForm = consentToken ? consentForms?.find((f) => f.access_token === consentToken) : null;
  const color = avatarColorFor(client.id);
  const tabHref = (key: string) => `/clients/${id}${key === "overview" ? "" : `?tab=${key}`}`;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/clients" className="text-[13px] font-semibold text-brand-ink">
        ← Back to Clients
      </Link>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">{decodeURIComponent(error)}</p>
      )}
      {invited && (
        <p className="mt-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">Portal invite sent.</p>
      )}

      {sentForm && (
        <div className="mt-4 rounded-lg bg-ok-tint px-3 py-2.5 text-[13px] text-ok">
          <div className="font-semibold">
            &ldquo;{sentForm.form_type}&rdquo; created. Share this link with the client to sign:
          </div>
          <div className="mt-1 select-all break-all rounded bg-surface px-2 py-1 font-mono text-[12px] text-foreground">
            {siteUrl}/consent/{sentForm.access_token}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Left: client list -- hidden on mobile, where "Back to Clients"
            above already covers switching clients, and this list would
            otherwise squeeze the actual client content off-screen. */}
        <div className="hidden space-y-1.5 lg:block">
          {allClients?.map((c) => {
            const isSelected = c.id === id;
            const cColor = avatarColorFor(c.id);
            return (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className={`flex items-center gap-2.5 rounded-xl border-l-[3px] px-3 py-2.5 transition ${
                  isSelected
                    ? "border-l-brand bg-brand-tint"
                    : "border-l-transparent hover:bg-surface-2"
                }`}
              >
                <span
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-[11px] font-bold ${cColor.bg} ${cColor.text}`}
                >
                  {initialsOf(c.full_name)}
                </span>
                <span className="min-w-0">
                  <span className={`block truncate text-[13.4px] font-semibold ${isSelected ? "text-brand-ink" : "text-foreground"}`}>
                    {c.full_name}
                  </span>
                  <span className="block truncate text-[11.5px] text-text-3">{c.presenting_concern ?? "—"}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right: detail panel */}
        <div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <span
                  className={`flex h-16 w-16 flex-none items-center justify-center rounded-full text-[20px] font-bold ${color.bg} ${color.text}`}
                >
                  {initialsOf(client.full_name)}
                </span>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-[22px] font-bold tracking-tight text-foreground">{client.full_name}</h1>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[client.status]}`}
                    >
                      {STATUS_LABEL[client.status]}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-text-2">
                    {client.date_of_birth && <span>🎂 {client.date_of_birth}</span>}
                    {client.phone && <span>📞 {client.phone}</span>}
                    {client.email && <span>✉️ {client.email}</span>}
                    {client.session_frequency && <span>📋 {client.session_frequency}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <Link
                    href={`/clients/${id}?edit=1${activeTab !== "overview" ? `&tab=${activeTab}` : ""}`}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] font-semibold text-text-2 transition hover:bg-surface-2"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    Edit
                  </Link>
                )}
                {canMessage && (
                  <Link
                    href={`/messages/${client.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-[13px] font-semibold text-text-2 transition hover:bg-surface-2"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" />
                    </svg>
                    Message
                  </Link>
                )}
                <Link
                  href={`/calendar/new?clientId=${client.id}`}
                  className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-ink"
                >
                  Schedule
                </Link>
              </div>
            </div>

            {canInviteToPortal && (
              <form
                action={client.portal_user_id ? resendPortalInvite : inviteToPortal}
                className="mt-3 border-t border-border pt-3"
              >
                <input type="hidden" name="clientId" value={client.id} />
                <button
                  type="submit"
                  disabled={!client.email}
                  title={client.email ? undefined : "Add an email address first"}
                  className="text-[12px] font-semibold text-brand-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {client.portal_user_id ? "Resend portal invite" : "Invite to client portal"}
                </button>
              </form>
            )}

            <div className="mt-4 flex gap-1 overflow-x-auto border-t border-border pt-4">
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={tabHref(t.key)}
                  className={`-mb-px flex-none whitespace-nowrap border-b-2 px-2.5 pb-2 text-[13.4px] font-semibold transition ${
                    activeTab === t.key
                      ? "border-brand text-foreground"
                      : "border-transparent text-text-3 hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="mb-2 text-[13px] font-bold text-foreground">Clinical summary</div>
                  <p className="text-[13.4px] leading-relaxed text-text-2">
                    Presenting concern: <span className="font-semibold text-foreground">{client.presenting_concern ?? "Not on file"}</span>.{" "}
                    {clinician ? (
                      <>Treating clinician: {clinician.full_name}. </>
                    ) : (
                      "No clinician assigned. "
                    )}
                    In treatment since {new Date(client.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    {client.session_frequency ? `, meeting ${client.session_frequency.toLowerCase()}.` : "."}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="mb-2 text-[13px] font-bold text-foreground">Consent status</div>
                  {consentForms?.length ? (
                    <ul className="space-y-2 text-[13.4px]">
                      {consentForms.map((f) => (
                        <li key={f.id} className="flex items-center justify-between">
                          <span className="text-foreground">{f.form_type}</span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${CONSENT_STATUS_STYLE[f.status]}`}
                          >
                            {CONSENT_STATUS_LABEL[f.status]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-text-3">No consent forms sent yet.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="mb-2 text-[13px] font-bold text-foreground">Billing snapshot</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-surface-2 p-3">
                      <div className="text-[11.5px] font-semibold text-text-3">Balance</div>
                      <div className={`mt-1 text-[19px] font-bold ${client.balance_cents > 0 ? "text-warn" : "text-foreground"}`}>
                        ${(client.balance_cents / 100).toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-2 p-3">
                      <div className="text-[11.5px] font-semibold text-text-3">Invoices</div>
                      <div className="mt-1 text-[19px] font-bold text-foreground">{invoices?.length ?? 0}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="mb-2 text-[13px] font-bold text-foreground">Recent notes</div>
                  {canSeeNotes ? (
                    notes?.length ? (
                      <ul className="space-y-2 text-[13.4px]">
                        {notes.slice(0, 5).map((n) => (
                          <li key={n.id}>
                            <Link href={`/notes/${n.id}`} className="flex items-center justify-between hover:text-brand-ink">
                              <span className="text-foreground">{n.session_date}</span>
                              <span className={`font-semibold ${n.status === "signed" ? "text-ok" : "text-warn"}`}>
                                {n.status === "signed" ? "Signed" : "Unsigned"}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[13px] text-text-3">No session notes yet.</p>
                    )
                  ) : (
                    <p className="text-[13px] text-text-3">Not visible to your role.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[13px] font-bold text-foreground">Upcoming appointments</div>
                    <Link href={`/calendar/new?clientId=${client.id}`} className="text-[12px] font-semibold text-brand-ink">
                      + Schedule
                    </Link>
                  </div>
                  {upcoming?.length ? (
                    <ul className="space-y-2 text-[13.4px]">
                      {upcoming.map((a) => (
                        <li key={a.id}>
                          <Link href={`/calendar/${a.id}`} className="flex justify-between hover:text-brand-ink">
                            <span className="text-foreground">
                              {new Date(a.starts_at).toLocaleString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-text-3">{a.type}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-text-3">No upcoming appointments.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Session Notes tab */}
          {activeTab === "notes" && (
            <div className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[13px] font-bold text-foreground">Session notes</div>
                {canSeeNotes && (
                  <Link href={`/notes/new?clientId=${client.id}`} className="text-[12px] font-semibold text-brand-ink">
                    + New note
                  </Link>
                )}
              </div>
              {!canSeeNotes ? (
                <p className="text-[13px] text-text-3">
                  Session note content isn&apos;t visible to your role. This is enforced by the database.
                </p>
              ) : notes?.length ? (
                <ul className="space-y-3">
                  {notes.map((n) => (
                    <li key={n.id} className="border-b border-border pb-3 last:border-0">
                      <Link href={`/notes/${n.id}`} className="block hover:opacity-80">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-foreground">{n.session_date}</span>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                              n.status === "signed" ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"
                            }`}
                          >
                            {n.status === "signed" ? "Signed" : "Draft"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[12.5px] text-text-2">{n.subjective || "No subjective notes yet."}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text-3">No session notes yet.</p>
              )}
            </div>
          )}

          {/* Consent Forms tab */}
          {activeTab === "consent" && (
            <div className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-3 text-[13px] font-bold text-foreground">Consent forms</div>
              {consentForms?.length ? (
                <ul className="space-y-2 text-[13.4px]">
                  {consentForms.map((f) => (
                    <li key={f.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                      <span className="text-foreground">{f.form_type}</span>
                      <span className="flex items-center gap-2">
                        {f.status === "pending" && (
                          <span className="select-all font-mono text-[11px] text-text-3">
                            {siteUrl}/consent/{f.access_token}
                          </span>
                        )}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${CONSENT_STATUS_STYLE[f.status]}`}
                        >
                          {CONSENT_STATUS_LABEL[f.status]}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text-3">No consent forms sent yet.</p>
              )}

              {canSendConsent && (
                <form action={sendConsentForm} className="mt-4 flex items-end gap-2 border-t border-border pt-4">
                  <input type="hidden" name="clientId" value={client.id} />
                  <div className="flex-1">
                    <label className="block text-[12px] font-semibold text-text-2">Send a form</label>
                    <select
                      name="templateId"
                      required
                      defaultValue=""
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                    >
                      <option value="" disabled>
                        {templates?.length ? "Select a template" : "No active templates — add one first"}
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
                    disabled={!templates?.length}
                    className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              )}
              {canSendConsent && (
                <Link href="/forms" className="mt-2 inline-block text-[11.5px] font-semibold text-brand-ink">
                  Manage templates
                </Link>
              )}
            </div>
          )}

          {/* Billing tab */}
          {activeTab === "billing" && (
            <>
              {canManageInvoices && (
                <div className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="text-[13px] font-bold text-foreground">Card on file</div>
                  {client.stripe_card_last4 ? (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[13.4px] text-foreground">
                        {client.stripe_card_brand ?? "Card"} •••• {client.stripe_card_last4}
                      </span>
                      <form action={removeSavedCard}>
                        <input type="hidden" name="clientId" value={client.id} />
                        <button type="submit" className="text-[11.5px] font-semibold text-bad">
                          Remove
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p className="mt-2 text-[13px] text-text-3">
                      No card on file yet — the client can save one the next time they pay an invoice online.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[13px] font-bold text-foreground">Invoices</div>
                {canManageInvoices && (
                  <Link href={`/invoices/new?clientId=${client.id}`} className="text-[12px] font-semibold text-brand-ink">
                    + New invoice
                  </Link>
                )}
              </div>
              {invoices?.length ? (
                <ul className="space-y-2 text-[13.4px]">
                  {invoices.map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="flex items-center justify-between border-b border-border pb-2 last:border-0"
                      >
                        <span className="text-foreground">
                          INV-{String(inv.invoice_number).padStart(4, "0")}
                          <span className="ml-2 text-text-3">{inv.issue_date}</span>
                        </span>
                        <span className="text-text-2">
                          ${(inv.total_cents / 100).toFixed(2)}
                          {inv.status !== "draft" && inv.status !== "void" && inv.total_cents > inv.amount_paid_cents && (
                            <span className="ml-2 text-warn">
                              (${((inv.total_cents - inv.amount_paid_cents) / 100).toFixed(2)} due)
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text-3">No invoices yet.</p>
              )}
              </div>
            </>
          )}

          {/* Documents tab */}
          {activeTab === "documents" && (
            <div className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-3 text-[13px] font-bold text-foreground">Documents</div>
              {documents?.length ? (
                <ul className="divide-y divide-border">
                  {documents.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 py-2.5">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 flex-none text-text-3"
                      >
                        <path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                        <path d="M9 12h6M9 16h6M9 8h3" />
                      </svg>
                      <div className="flex-1 text-[13.4px]">
                        <div className="text-foreground">{d.file_name}</div>
                        <div className="text-[11.5px] text-text-3">
                          {formatFileSize(d.file_size_bytes)} · added {new Date(d.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <a
                        href={`/clients/${id}/documents/${d.id}/download`}
                        className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-text-2 transition hover:bg-surface-2"
                      >
                        Download
                      </a>
                      {canDeleteDocuments && (
                        <form action={deleteClientDocument}>
                          <input type="hidden" name="clientId" value={id} />
                          <input type="hidden" name="documentId" value={d.id} />
                          <button type="submit" className="text-[12px] font-semibold text-bad">
                            Delete
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-text-3">No documents uploaded yet.</p>
              )}

              {canUploadDocuments && (
                <form action={uploadClientDocument} className="mt-4 flex items-end gap-2 border-t border-border pt-4">
                  <input type="hidden" name="clientId" value={id} />
                  <div className="flex-1">
                    <label className="block text-[12px] font-semibold text-text-2">Upload document</label>
                    <input
                      type="file"
                      name="file"
                      required
                      accept="application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="mt-1 block w-full text-[12.5px] text-text-2 file:mr-3 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-text-2 hover:file:bg-surface-2"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-ink"
                  >
                    Upload
                  </button>
                </form>
              )}
              <p className="mt-2 text-[11px] text-text-3">PDF, Word, or image — up to 10 MB.</p>
            </div>
          )}
        </div>
      </div>

      {edit && canEdit && (
        <EditClientModal
          client={client}
          closeHref={`/clients/${id}${activeTab !== "overview" ? `?tab=${activeTab}` : ""}`}
          error={error}
        />
      )}
    </div>
  );
}
