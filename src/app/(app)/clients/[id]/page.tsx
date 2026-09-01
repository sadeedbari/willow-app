import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sendConsentForm } from "./consent-actions";
import { inviteToPortal } from "./portal-actions";
import { updateDefaultAppointmentType } from "./booking-actions";
import { APPOINTMENT_TYPE_LABEL, SELF_BOOKABLE_TYPES } from "@/utils/appointment-types";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  on_hold: "On hold",
  discharged: "Discharged",
  waitlisted: "Waitlisted",
};

const CONSENT_STATUS_STYLE: Record<string, string> = {
  pending: "bg-warn-tint text-warn",
  signed: "bg-ok-tint text-ok",
  expired: "bg-surface-2 text-text-3",
};

const CONSENT_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting signature",
  signed: "Signed",
  expired: "Expired",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; consentToken?: string }>;
}) {
  const { id } = await params;
  const { error, consentToken } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, full_name, date_of_birth, phone, email, presenting_concern, status, payer, balance_cents, assigned_staff_id, portal_user_id, default_appointment_type")
    .eq("id", id)
    .single();

  if (!client) notFound();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, starts_at, type, status")
    .eq("client_id", id)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(5);

  const isOwnClient = client.assigned_staff_id === staff.id;
  const canSeeNotes = staff.role === "clinician" && isOwnClient;
  const canManageInvoices = staff.role === "practice_admin" || staff.role === "billing_admin";
  const canSendConsent = staff.role === "practice_admin" || staff.role === "front_desk";
  const canInviteToPortal = staff.role === "practice_admin" || staff.role === "front_desk";
  const canMessage = staff.role === "practice_admin" || (staff.role === "clinician" && isOwnClient);
  const canEditBookingType = staff.role === "practice_admin" || staff.role === "front_desk";

  const { data: notes } = canSeeNotes
    ? await supabase
        .from("session_notes")
        .select("id, session_date, status, subjective")
        .eq("client_id", id)
        .order("session_date", { ascending: false })
    : { data: null };

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, total_cents, amount_paid_cents")
    .eq("client_id", id)
    .order("issue_date", { ascending: false })
    .limit(5);

  const { data: consentForms } = await supabase
    .from("consent_forms")
    .select("id, form_type, status, signed_at, access_token")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const { data: templates } = canSendConsent
    ? await supabase
        .from("consent_form_templates")
        .select("id, title")
        .eq("active", true)
        .order("title")
    : { data: null };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const sentForm = consentToken ? consentForms?.find((f) => f.access_token === consentToken) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/clients" className="text-[13px] font-semibold text-brand-ink">
        ← Back to clients
      </Link>

      {error && (
        <p className="mt-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">
          {decodeURIComponent(error)}
        </p>
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

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            {client.full_name}
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {client.presenting_concern ?? "No presenting concern on file"}
          </p>
        </div>
        <span className="inline-flex rounded-full bg-ok-tint px-2.5 py-0.5 text-[11.5px] font-semibold text-ok">
          {STATUS_LABEL[client.status]}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 text-[13px] font-bold text-foreground">
            Client details
          </div>
          <dl className="space-y-2 text-[13.4px]">
            <div className="flex justify-between">
              <dt className="text-text-3">Date of birth</dt>
              <dd className="text-foreground">{client.date_of_birth ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Phone</dt>
              <dd className="text-foreground">{client.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Email</dt>
              <dd className="text-foreground">{client.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-3">Payer</dt>
              <dd className="text-foreground">{client.payer ?? "—"}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="font-semibold text-text-2">Balance</dt>
              <dd
                className={`font-semibold ${client.balance_cents > 0 ? "text-warn" : "text-ok"}`}
              >
                ${(client.balance_cents / 100).toFixed(2)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-border pt-3">
            {canEditBookingType ? (
              <form action={updateDefaultAppointmentType} className="flex items-end gap-2">
                <input type="hidden" name="clientId" value={client.id} />
                <div className="flex-1">
                  <label className="block text-[12px] font-semibold text-text-2">
                    Default self-booking type
                  </label>
                  <select
                    name="defaultAppointmentType"
                    defaultValue={client.default_appointment_type ?? ""}
                    className="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    <option value="">Not set — client will choose on first booking</option>
                    {SELF_BOOKABLE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {APPOINTMENT_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-ink"
                >
                  Save
                </button>
              </form>
            ) : (
              <div className="flex justify-between text-[13.4px]">
                <span className="text-text-3">Default self-booking type</span>
                <span className="text-foreground">
                  {client.default_appointment_type
                    ? APPOINTMENT_TYPE_LABEL[client.default_appointment_type as keyof typeof APPOINTMENT_TYPE_LABEL]
                    : "Not set"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-bold text-foreground">
              Upcoming appointments
            </div>
            <Link
              href={`/calendar/new?clientId=${client.id}`}
              className="text-[12px] font-semibold text-brand-ink"
            >
              + Schedule
            </Link>
          </div>
          {appointments?.length ? (
            <ul className="space-y-2 text-[13.4px]">
              {appointments.map((a) => (
                <li key={a.id} className="border-b border-border pb-2 last:border-0">
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

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-bold text-foreground">Invoices</div>
          <div className="flex items-center gap-3">
            {invoices?.length ? (
              <Link href="/invoices" className="text-[12px] font-semibold text-brand-ink">
                View all
              </Link>
            ) : null}
            {canManageInvoices && (
              <Link
                href={`/invoices/new?clientId=${client.id}`}
                className="text-[12px] font-semibold text-brand-ink"
              >
                + New invoice
              </Link>
            )}
          </div>
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

      {canMessage && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold text-foreground">Messages</div>
              <div className="mt-1 text-[12px] text-text-3">
                Client portal:{" "}
                {client.portal_user_id ? (
                  <span className="font-semibold text-ok">Active</span>
                ) : (
                  <span className="text-text-3">Not invited yet</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!client.portal_user_id && canInviteToPortal && (
                <form action={inviteToPortal}>
                  <input type="hidden" name="clientId" value={client.id} />
                  <button
                    type="submit"
                    disabled={!client.email}
                    title={client.email ? undefined : "Add an email address first"}
                    className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-text-2 transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Invite to portal
                  </button>
                </form>
              )}
              <Link
                href={`/messages/${client.id}`}
                className="rounded-lg bg-brand px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-brand-ink"
              >
                Open conversation
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
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
          <Link href="/consent-templates" className="mt-2 inline-block text-[11.5px] font-semibold text-brand-ink">
            Manage templates
          </Link>
        )}
      </div>

      {canSeeNotes && (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-bold text-foreground">
              Session notes
            </div>
            <Link
              href={`/notes/new?clientId=${client.id}`}
              className="text-[12px] font-semibold text-brand-ink"
            >
              + New note
            </Link>
          </div>
          {notes?.length ? (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-foreground">
                      {n.session_date}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        n.status === "signed" ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"
                      }`}
                    >
                      {n.status === "signed" ? "Signed" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12.5px] text-text-2">
                    {n.subjective || "No subjective notes yet."}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-text-3">No session notes yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
