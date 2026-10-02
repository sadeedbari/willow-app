import type { SupabaseClient } from "@supabase/supabase-js";
import { strToU8, zipSync } from "fflate";
import { dollars, toCsv, type Column } from "./csv";
import { DISPLAY_TIME_ZONE } from "@/utils/timezone";

type Row = Record<string, unknown>;

// PostgREST returns at most 1000 rows per request, so a practice with a long
// history would be silently truncated without paging.
const PAGE_SIZE = 1000;

async function fetchAll(
  label: string,
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not read ${label}: ${error.message}`);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

// "2026-10-05 17:00:00" in Toronto time, next to the UTC value, so the file
// reads the same as the calendar did.
function localTime(iso: unknown): string {
  return typeof iso === "string" && iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: DISPLAY_TIME_ZONE }) : "";
}

function minutesBetween(start: unknown, end: unknown): string {
  if (typeof start !== "string" || typeof end !== "string") return "";
  return String(Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

function inner<T>(row: Row, key: string): T | null {
  return (row[key] as T | null) ?? null;
}

export type ExportScope = { kind: "client"; clientId: string } | { kind: "practice" };

export async function buildExportFiles(
  supabase: SupabaseClient,
  scope: ExportScope,
  opts: { practiceName: string },
): Promise<{ files: Record<string, string>; counts: Record<string, number> }> {
  const clientId = scope.kind === "client" ? scope.clientId : null;

  const staffRows = await fetchAll("staff", (f, t) =>
    supabase
      .from("staff")
      .select("id, full_name, role, credential, license_number, license_province, email, phone, active, created_at")
      .order("created_at")
      .range(f, t),
  );
  const staffName = new Map(staffRows.map((s) => [s.id as string, s.full_name as string]));
  const staffLabel = (id: unknown) => (typeof id === "string" ? (staffName.get(id) ?? "") : "");

  const clients = await fetchAll("clients", (f, t) => {
    let q = supabase
      .from("clients")
      .select(
        "id, full_name, date_of_birth, phone, email, status, presenting_concern, payer, assigned_staff_id, default_appointment_type, session_frequency, balance_cents, appointment_reminders_enabled, created_at, updated_at",
      )
      .order("full_name");
    if (clientId) q = q.eq("id", clientId);
    return q.range(f, t);
  });
  const clientName = new Map(clients.map((c) => [c.id as string, c.full_name as string]));
  const clientLabel = (id: unknown) => (typeof id === "string" ? (clientName.get(id) ?? "") : "");
  // A client's own file doesn't need a "client" column repeated on every row.
  const withClient = <T extends Row>(cols: Column<T>[]): Column<T>[] =>
    clientId ? cols : [{ header: "client_name", value: (r) => clientLabel(r.client_id) }, ...cols];

  const appointments = await fetchAll("appointments", (f, t) => {
    let q = supabase
      .from("appointments")
      .select("id, client_id, staff_id, starts_at, ends_at, type, location_type, status, custom_description, created_at, updated_at")
      .order("starts_at");
    if (clientId) q = q.eq("client_id", clientId);
    return q.range(f, t);
  });

  const notes = await fetchAll("session notes", (f, t) => {
    let q = supabase
      .from("session_notes")
      .select(
        "id, appointment_id, client_id, staff_id, session_date, status, signed_at, subjective, objective, assessment, plan, risk_level, risk_notes, ai_generated, created_at, updated_at",
      )
      .order("session_date");
    if (clientId) q = q.eq("client_id", clientId);
    return q.range(f, t);
  });
  const noteIds = new Set(notes.map((n) => n.id as string));
  const addenda = (
    await fetchAll("note addenda", (f, t) =>
      supabase.from("session_note_addenda").select("id, note_id, staff_id, content, created_at").order("created_at").range(f, t),
    )
  ).filter((a) => noteIds.has(a.note_id as string));

  const invoices = await fetchAll("invoices", (f, t) => {
    let q = supabase
      .from("invoices")
      .select(
        "id, client_id, invoice_number, invoice_label, status, issue_date, due_date, total_cents, amount_paid_cents, payment_method, paid_at, notes, created_at",
      )
      .order("issue_date");
    if (clientId) q = q.eq("client_id", clientId);
    return q.range(f, t);
  });

  const lineItems = await fetchAll("invoice line items", (f, t) => {
    let q = supabase
      .from("invoice_line_items")
      .select(
        "id, invoice_id, appointment_id, service_date, description, service_code, quantity, unit_amount_cents, amount_cents, invoices!inner(client_id, invoice_number, invoice_label)",
      )
      .order("service_date");
    if (clientId) q = q.eq("invoices.client_id", clientId);
    return q.range(f, t);
  });

  const consentForms = await fetchAll("consent forms", (f, t) => {
    let q = supabase
      .from("consent_forms")
      .select("id, client_id, form_type, status, sent_at, signed_at, signer_name, body_snapshot, created_at")
      .order("created_at");
    if (clientId) q = q.eq("client_id", clientId);
    return q.range(f, t);
  });

  const documents = await fetchAll("documents", (f, t) => {
    let q = supabase
      .from("client_documents")
      .select("id, client_id, uploaded_by_staff_id, file_name, content_type, file_size_bytes, created_at")
      .order("created_at");
    if (clientId) q = q.eq("client_id", clientId);
    return q.range(f, t);
  });

  const messages = await fetchAll("messages", (f, t) => {
    let q = supabase
      .from("messages")
      .select("id, sender_type, sender_staff_id, body, created_at, message_threads!inner(client_id)")
      .order("created_at");
    if (clientId) q = q.eq("message_threads.client_id", clientId);
    return q.range(f, t);
  });

  const files: Record<string, string> = {};

  files["clients.csv"] = toCsv(clients, [
    { header: "id", value: (r) => r.id },
    { header: "full_name", value: (r) => r.full_name },
    { header: "date_of_birth", value: (r) => r.date_of_birth },
    { header: "phone", value: (r) => r.phone },
    { header: "email", value: (r) => r.email },
    { header: "status", value: (r) => r.status },
    { header: "presenting_concern", value: (r) => r.presenting_concern },
    { header: "payer", value: (r) => r.payer },
    { header: "assigned_clinician", value: (r) => staffLabel(r.assigned_staff_id) },
    { header: "default_appointment_type", value: (r) => r.default_appointment_type },
    { header: "session_frequency", value: (r) => r.session_frequency },
    { header: "balance_cad", value: (r) => dollars(r.balance_cents as number) },
    { header: "appointment_reminders_enabled", value: (r) => r.appointment_reminders_enabled },
    { header: "created_at", value: (r) => r.created_at },
    { header: "updated_at", value: (r) => r.updated_at },
  ]);

  files["appointments.csv"] = toCsv(
    appointments,
    withClient<Row>([
      { header: "id", value: (r) => r.id },
      { header: "starts_at_toronto", value: (r) => localTime(r.starts_at) },
      { header: "starts_at_utc", value: (r) => r.starts_at },
      { header: "ends_at_utc", value: (r) => r.ends_at },
      { header: "duration_minutes", value: (r) => minutesBetween(r.starts_at, r.ends_at) },
      { header: "type", value: (r) => r.type },
      { header: "location", value: (r) => r.location_type },
      { header: "status", value: (r) => r.status },
      { header: "clinician", value: (r) => staffLabel(r.staff_id) },
      { header: "service_description", value: (r) => r.custom_description },
      { header: "created_at", value: (r) => r.created_at },
    ]),
  );

  files["session_notes.csv"] = toCsv(
    notes,
    withClient<Row>([
      { header: "id", value: (r) => r.id },
      { header: "appointment_id", value: (r) => r.appointment_id },
      { header: "session_date", value: (r) => r.session_date },
      { header: "status", value: (r) => r.status },
      { header: "signed_at", value: (r) => r.signed_at },
      { header: "clinician", value: (r) => staffLabel(r.staff_id) },
      { header: "subjective", value: (r) => r.subjective },
      { header: "objective", value: (r) => r.objective },
      { header: "assessment", value: (r) => r.assessment },
      { header: "plan", value: (r) => r.plan },
      { header: "risk_level", value: (r) => r.risk_level },
      { header: "risk_notes", value: (r) => r.risk_notes },
      { header: "ai_generated", value: (r) => r.ai_generated },
      { header: "created_at", value: (r) => r.created_at },
      { header: "updated_at", value: (r) => r.updated_at },
    ]),
  );
  files["session_note_addenda.csv"] = toCsv(addenda, [
    { header: "id", value: (r) => r.id },
    { header: "note_id", value: (r) => r.note_id },
    { header: "clinician", value: (r) => staffLabel(r.staff_id) },
    { header: "content", value: (r) => r.content },
    { header: "created_at", value: (r) => r.created_at },
  ]);

  files["invoices.csv"] = toCsv(
    invoices,
    withClient<Row>([
      { header: "id", value: (r) => r.id },
      { header: "invoice_number", value: (r) => r.invoice_number },
      { header: "invoice_label", value: (r) => r.invoice_label },
      { header: "status", value: (r) => r.status },
      { header: "issue_date", value: (r) => r.issue_date },
      { header: "due_date", value: (r) => r.due_date },
      { header: "total_cad", value: (r) => dollars(r.total_cents as number) },
      { header: "amount_paid_cad", value: (r) => dollars(r.amount_paid_cents as number) },
      { header: "payment_method", value: (r) => r.payment_method },
      { header: "paid_at", value: (r) => r.paid_at },
      { header: "notes", value: (r) => r.notes },
      { header: "created_at", value: (r) => r.created_at },
    ]),
  );
  files["invoice_line_items.csv"] = toCsv(lineItems, [
    ...(clientId
      ? []
      : [{ header: "client_name", value: (r: Row) => clientLabel(inner<Row>(r, "invoices")?.client_id) }]),
    { header: "invoice_id", value: (r) => r.invoice_id },
    { header: "invoice_number", value: (r) => inner<Row>(r, "invoices")?.invoice_number },
    { header: "invoice_label", value: (r) => inner<Row>(r, "invoices")?.invoice_label },
    { header: "service_date", value: (r) => r.service_date },
    { header: "description", value: (r) => r.description },
    { header: "service_code", value: (r) => r.service_code },
    { header: "quantity", value: (r) => r.quantity },
    { header: "unit_amount_cad", value: (r) => dollars(r.unit_amount_cents as number) },
    { header: "amount_cad", value: (r) => dollars(r.amount_cents as number) },
    { header: "appointment_id", value: (r) => r.appointment_id },
  ]);

  files["consent_forms.csv"] = toCsv(
    consentForms,
    withClient<Row>([
      { header: "id", value: (r) => r.id },
      { header: "form_type", value: (r) => r.form_type },
      { header: "status", value: (r) => r.status },
      { header: "sent_at", value: (r) => r.sent_at },
      { header: "signed_at", value: (r) => r.signed_at },
      { header: "signer_name", value: (r) => r.signer_name },
      { header: "form_text", value: (r) => r.body_snapshot },
      { header: "created_at", value: (r) => r.created_at },
    ]),
  );

  files["documents.csv"] = toCsv(
    documents,
    withClient<Row>([
      { header: "id", value: (r) => r.id },
      { header: "file_name", value: (r) => r.file_name },
      { header: "content_type", value: (r) => r.content_type },
      { header: "size_bytes", value: (r) => r.file_size_bytes },
      { header: "uploaded_by", value: (r) => staffLabel(r.uploaded_by_staff_id) },
      { header: "uploaded_at", value: (r) => r.created_at },
    ]),
  );

  files["messages.csv"] = toCsv(messages, [
    ...(clientId
      ? []
      : [{ header: "client_name", value: (r: Row) => clientLabel(inner<Row>(r, "message_threads")?.client_id) }]),
    { header: "sent_at", value: (r) => r.created_at },
    { header: "sender", value: (r) => (r.sender_type === "staff" ? staffLabel(r.sender_staff_id) || "Staff" : "Client") },
    { header: "body", value: (r) => r.body },
  ]);

  if (scope.kind === "practice") {
    const serviceCodes = await fetchAll("services", (f, t) =>
      supabase.from("service_codes").select("code, description, default_rate_cents, active, default_for_type").order("code").range(f, t),
    );
    files["services.csv"] = toCsv(serviceCodes, [
      { header: "code", value: (r) => r.code },
      { header: "description", value: (r) => r.description },
      { header: "default_rate_cad", value: (r) => dollars(r.default_rate_cents as number) },
      { header: "default_for_type", value: (r) => r.default_for_type },
      { header: "active", value: (r) => r.active },
    ]);
    files["staff.csv"] = toCsv(staffRows, [
      { header: "full_name", value: (r) => r.full_name },
      { header: "role", value: (r) => r.role },
      { header: "credential", value: (r) => r.credential },
      { header: "license_number", value: (r) => r.license_number },
      { header: "license_province", value: (r) => r.license_province },
      { header: "email", value: (r) => r.email },
      { header: "phone", value: (r) => r.phone },
      { header: "active", value: (r) => r.active },
      { header: "created_at", value: (r) => r.created_at },
    ]);
  }

  const counts: Record<string, number> = {
    clients: clients.length,
    appointments: appointments.length,
    session_notes: notes.length,
    invoices: invoices.length,
    consent_forms: consentForms.length,
    documents: documents.length,
    messages: messages.length,
  };

  files["README.txt"] = [
    scope.kind === "client" ? `Client record export — ${clients[0]?.full_name ?? ""}` : `Practice data export — ${opts.practiceName}`,
    `Exported from Willow on ${new Date().toISOString().slice(0, 10)}`,
    "",
    "Each .csv file opens in Excel, Numbers or Google Sheets. Times named *_toronto are Eastern time;",
    "other timestamps are UTC (ISO 8601). Amounts are in Canadian dollars.",
    "",
    "Rows in this export:",
    ...Object.entries(counts).map(([name, n]) => `  ${name}: ${n}`),
    "",
    "Not included:",
    "  - The uploaded document files themselves (documents.csv lists their names). Download each one",
    "    from the client's Documents tab before your access ends.",
    "  - Session notes you can't see in Willow. This export contains exactly what your account can see.",
    "",
    "This file contains personal health information. Store it securely and share it only with people",
    "entitled to it.",
    "",
  ].join("\r\n");

  return { files, counts };
}

export function zipFiles(files: Record<string, string>): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)])));
}

export function fileSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "export";
}
