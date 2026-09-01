import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";

const CLIENT_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  on_hold: "On hold",
  discharged: "Discharged",
  waitlisted: "Waitlisted",
};

const NOTE_STATUS_STYLE: Record<string, string> = {
  draft: "bg-warn-tint text-warn",
  signed: "bg-ok-tint text-ok",
};

const INVOICE_STATUS_STYLE: Record<string, string> = {
  draft: "bg-surface-2 text-text-3",
  sent: "bg-hue-cal-tint text-hue-cal",
  paid: "bg-ok-tint text-ok",
  void: "bg-bad-tint text-bad",
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const query = q?.trim() ?? "";

  if (!query) {
    return (
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Search</h1>
        <p className="mt-3 text-[13.5px] text-text-2">
          Search for a client by name, email, or phone; a note by client; or an invoice by
          number.
        </p>
      </div>
    );
  }

  // Strip characters that are structurally significant in PostgREST's
  // .or()/.in() filter syntax (comma separates conditions, parens bound an
  // `in` list) so user input can't break out of the intended filter.
  const safeQuery = query.replace(/[,()]/g, "");

  const { data: matchingClients } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, status")
    .or(`full_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%,phone.ilike.%${safeQuery}%`)
    .order("full_name")
    .limit(15);

  const clients = matchingClients ?? [];
  const clientIds = clients.map((c) => c.id);
  const clientIdList = clientIds.length ? `(${clientIds.join(",")})` : null;

  type NoteRow = {
    id: string;
    session_date: string;
    status: string;
    clients: { full_name: string } | null;
  };
  let notes: NoteRow[] = [];

  if (staff.role === "clinician") {
    const contentFilter = `subjective.ilike.%${safeQuery}%,objective.ilike.%${safeQuery}%,assessment.ilike.%${safeQuery}%,plan.ilike.%${safeQuery}%`;
    const filter = clientIdList ? `${contentFilter},client_id.in.${clientIdList}` : contentFilter;
    const { data } = await supabase
      .from("session_notes")
      .select("id, session_date, status, clients(full_name)")
      .or(filter)
      .order("session_date", { ascending: false })
      .limit(15);
    notes = (data ?? []) as unknown as NoteRow[];
  } else if (clientIdList) {
    // Practice admins never query note content, even in search -- same
    // minimum-necessary-access posture as the Notes list page.
    const { data } = await supabase
      .from("session_notes")
      .select("id, session_date, status, clients(full_name)")
      .in("client_id", clientIds)
      .order("session_date", { ascending: false })
      .limit(15);
    notes = (data ?? []) as unknown as NoteRow[];
  }

  type InvoiceRow = {
    id: string;
    invoice_number: number;
    status: string;
    total_cents: number;
    clients: { full_name: string } | null;
  };
  let invoices: InvoiceRow[] = [];

  const numericQuery = Number(safeQuery);
  const isNumeric = safeQuery !== "" && Number.isFinite(numericQuery);

  if (clientIdList || isNumeric) {
    let invoicesQuery = supabase
      .from("invoices")
      .select("id, invoice_number, status, total_cents, clients(full_name)")
      .order("issue_date", { ascending: false })
      .limit(15);

    if (clientIdList && isNumeric) {
      invoicesQuery = invoicesQuery.or(`invoice_number.eq.${Math.trunc(numericQuery)},client_id.in.${clientIdList}`);
    } else if (isNumeric) {
      invoicesQuery = invoicesQuery.eq("invoice_number", Math.trunc(numericQuery));
    } else if (clientIdList) {
      invoicesQuery = invoicesQuery.in("client_id", clientIds);
    }

    const { data } = await invoicesQuery;
    invoices = (data ?? []) as unknown as InvoiceRow[];
  }

  const hasResults = clients.length > 0 || notes.length > 0 || invoices.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-[26px] font-bold tracking-tight text-foreground">Search</h1>
      <p className="mt-1 text-[13.5px] text-text-2">
        Results for &ldquo;{query}&rdquo;
      </p>

      {!hasResults && (
        <p className="mt-6 rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
          No matches found.
        </p>
      )}

      {clients.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[13px] font-bold text-foreground">Clients</div>
          <div className="space-y-2">
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand"
              >
                <div>
                  <div className="text-[13.4px] font-semibold text-foreground">{c.full_name}</div>
                  <div className="mt-0.5 text-[12px] text-text-3">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact info on file"}
                  </div>
                </div>
                <span className="text-[11.5px] font-semibold text-text-3">
                  {CLIENT_STATUS_LABEL[c.status] ?? c.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[13px] font-bold text-foreground">Session Notes</div>
          <div className="space-y-2">
            {notes.map((n) => (
              <Link
                key={n.id}
                href="/notes"
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand"
              >
                <div className="text-[13.4px] font-semibold text-foreground">
                  {n.clients?.full_name ?? "Unknown client"}
                  <span className="ml-2 font-normal text-text-3">{n.session_date}</span>
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${NOTE_STATUS_STYLE[n.status]}`}
                >
                  {n.status === "signed" ? "Signed" : "Draft"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {invoices.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[13px] font-bold text-foreground">Invoices</div>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand"
              >
                <div className="text-[13.4px] font-semibold text-foreground">
                  INV-{String(inv.invoice_number).padStart(4, "0")}
                  <span className="ml-2 font-normal text-text-3">
                    {inv.clients?.full_name ?? "Unknown client"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-text-2">{formatMoney(inv.total_cents)}</span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${INVOICE_STATUS_STYLE[inv.status]}`}
                  >
                    {inv.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
