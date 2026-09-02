import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { avatarColorFor, initialsOf } from "@/utils/avatar-color";

const CONSENT_STATUS_STYLE: Record<string, string> = {
  pending: "bg-warn-tint text-warn",
  signed: "bg-ok-tint text-ok",
  expired: "bg-bad-tint text-bad",
};

const CONSENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  signed: "Signed",
  expired: "Expired",
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

export default async function ClientsPage() {
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
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">Clients</h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {activeCount} active · {onHoldCount} on hold
          </p>
        </div>
        {canAdd && (
          <Link
            href="/clients/new"
            className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            + Add Client
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-[13.4px]">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wide text-text-3">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Presenting concern</th>
              <th className="px-4 py-3">Next session</th>
              <th className="px-4 py-3">Consent</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {clients?.map((c) => {
              const color = avatarColorFor(c.id);
              const nextSession = nextSessionByClient.get(c.id);
              const consentStatus = consentByClient.get(c.id);

              return (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${c.id}`} className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-[12.5px] font-bold ${color.bg} ${color.text}`}
                      >
                        {initialsOf(c.full_name)}
                      </span>
                      <span>
                        <span className="block font-semibold text-foreground">{c.full_name}</span>
                        <span className="block text-[12px] text-text-3">
                          {c.session_frequency ?? "—"} · since {formatSince(c.created_at)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-2">{c.presenting_concern ?? "—"}</td>
                  <td className="px-4 py-3 text-text-2">
                    {nextSession ? formatNextSession(nextSession) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {consentStatus ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${CONSENT_STATUS_STYLE[consentStatus]}`}
                      >
                        {CONSENT_STATUS_LABEL[consentStatus]}
                      </span>
                    ) : (
                      <span className="text-text-3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {c.balance_cents > 0 ? (
                      <span className="font-semibold text-warn">${(c.balance_cents / 100).toFixed(2)}</span>
                    ) : (
                      <span className="text-text-3">$0.00</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/clients/${c.id}`}
                      className="inline-flex rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-text-2 transition hover:bg-surface-3"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!clients?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-3">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
