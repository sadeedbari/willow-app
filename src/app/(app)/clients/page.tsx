import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { avatarColorFor, initialsOf } from "@/utils/avatar-color";
import { AddClientModal } from "./add-client-modal";
import { LiveSearchInput } from "@/components/live-search-input";

const CONSENT_STATUS_STYLE: Record<string, string> = {
  pending: "bg-warn-tint text-warn",
  signed: "bg-ok-tint text-ok",
  expired: "bg-bad-tint text-bad",
  cancelled: "bg-surface-2 text-text-3",
};

const CONSENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  signed: "Signed",
  expired: "Expired",
  cancelled: "Cancelled",
};

function formatSince(createdAt: string) {
  return new Date(createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function formatNextSession(startsAt: string) {
  const d = new Date(startsAt);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return isToday
    ? `Today · ${time}`
    : `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; error?: string }>;
}) {
  const { new: showNew, error } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [{ data: clients }, { data: appointments }, { data: consentForms }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, presenting_concern, status, session_frequency, balance_cents, created_at")
      .order("full_name"),
    supabase
      .from("appointments")
      .select("client_id, starts_at")
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at"),
    supabase
      .from("consent_forms")
      .select("client_id, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const nextSessionByClient = new Map<string, string>();
  for (const a of appointments ?? []) {
    if (!nextSessionByClient.has(a.client_id)) nextSessionByClient.set(a.client_id, a.starts_at);
  }

  const consentByClient = new Map<string, string>();
  for (const f of consentForms ?? []) {
    if (!consentByClient.has(f.client_id)) consentByClient.set(f.client_id, f.status);
  }

  const canAdd = staff.role === "practice_admin" || staff.role === "front_desk";
  const activeCount = clients?.filter((c) => c.status === "active").length ?? 0;
  const onHoldCount = clients?.filter((c) => c.status === "on_hold").length ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">Clients</h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {activeCount} active · {onHoldCount} on hold
          </p>
        </div>
        {canAdd && (
          <Link
            href="/clients?new=1"
            className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            + Add Client
          </Link>
        )}
      </div>

      {!!clients?.length && (
        <div className="mb-4">
          <LiveSearchInput placeholder="Search clients…" itemSelector="[data-client-row]" emptyStateSelector="[data-no-search-results]" />
        </div>
      )}

      <div className="space-y-2">
        {clients?.map((c) => {
          const color = avatarColorFor(c.id);
          const nextSession = nextSessionByClient.get(c.id);
          const consentStatus = consentByClient.get(c.id);

          return (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              data-client-row
              data-search={`${c.full_name} ${c.presenting_concern ?? ""}`.toLowerCase()}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12.5px] font-bold ${color.bg} ${color.text}`}
                >
                  {initialsOf(c.full_name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[13.4px] font-semibold text-foreground">{c.full_name}</div>
                  <div className="truncate text-[12px] text-text-3">
                    {c.presenting_concern ?? (c.session_frequency ? `${c.session_frequency} · since ${formatSince(c.created_at)}` : `Since ${formatSince(c.created_at)}`)}
                  </div>
                </div>
              </div>
              <div className="flex flex-none items-center gap-4">
                <div className="text-right">
                  <div className="text-[12.5px] text-text-2">
                    {nextSession ? formatNextSession(nextSession) : "No upcoming session"}
                  </div>
                  <div className="text-[13.4px] tabular-nums">
                    {c.balance_cents > 0 ? (
                      <span className="font-semibold text-warn">${(c.balance_cents / 100).toFixed(2)} due</span>
                    ) : (
                      <span className="text-text-3">$0.00</span>
                    )}
                  </div>
                </div>
                {consentStatus && (
                  <span
                    className={`inline-flex flex-none rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${CONSENT_STATUS_STYLE[consentStatus]}`}
                  >
                    {CONSENT_STATUS_LABEL[consentStatus]}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        {!!clients?.length && (
          <p data-no-search-results style={{ display: "none" }} className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No clients match your search.
          </p>
        )}
        {!clients?.length && (
          <p className="rounded-2xl border border-border bg-surface p-8 text-center text-[13px] text-text-3">
            No clients yet.
          </p>
        )}
      </div>

      {canAdd && showNew && <AddClientModal error={error} />}
    </div>
  );
}
