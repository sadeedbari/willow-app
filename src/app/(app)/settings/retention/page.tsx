import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsTabs } from "../tabs";

const REASON_LABEL: Record<string, string> = {
  minor_turned_18_plus_10y: "Client was a minor — 10 years past their 18th birthday",
  last_interaction_plus_10y: "10 years since the last completed session",
};

type RetentionRow = {
  client_id: string;
  client_full_name: string;
  client_status: string;
  last_completed_appointment: string;
  date_of_birth: string | null;
  retention_eligible_date: string;
  reason: string;
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function RetentionPage() {
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_retention_overview");
  const rows = (data ?? []) as RetentionRow[];

  const todayStr = new Date().toISOString().slice(0, 10);
  const twelveMonthsOutStr = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
    .toISOString()
    .slice(0, 10);

  const eligibleNow = rows.filter((r) => r.retention_eligible_date <= todayStr);
  const upcoming = rows.filter(
    (r) => r.retention_eligible_date > todayStr && r.retention_eligible_date <= twelveMonthsOutStr,
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-2">Practice defaults</p>
      </div>

      <SettingsTabs active="/settings/retention" />

      <div className="mb-5">
        <h2 className="text-[15px] font-bold text-foreground">Data retention</h2>
        <p className="mt-1 text-[13px] text-text-2">
          Ontario&apos;s CRPO practice standards require clinical, appointment, and financial records to
          be kept for at least 10 years from a client&apos;s last completed session — or 10 years past
          their 18th birthday if they were a minor at that time, whichever is later. This report flags
          clients who&apos;ve reached that floor so you can review and securely destroy their clinical
          records when you&apos;re ready. Nothing here is deleted automatically.
        </p>
      </div>

      <div className="mb-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-[13.5px] font-bold text-foreground">Export all practice data</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text-2">
          Download every client and their appointments, session notes, invoices, consent forms and messages as a ZIP
          of spreadsheet (CSV) files, along with your services and staff list. Use it to keep your own copy, move to
          another system, or take your records with you if you cancel. This is also available from the screen you
          see if your subscription ends. Uploaded document files aren&apos;t in the ZIP — download those from each
          client&apos;s Documents tab.
        </p>
        <form method="post" action="/settings/export" className="mt-3">
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-brand-ink"
          >
            Download all data (ZIP)
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-[13.5px] font-bold text-foreground">
          Eligible for secure destruction ({eligibleNow.length})
        </h3>
        {eligibleNow.length ? (
          <ul className="mt-3 space-y-2">
            {eligibleNow.map((r) => (
              <li key={r.client_id} className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/clients/${r.client_id}`} className="text-[13.4px] font-semibold text-foreground hover:text-brand-ink">
                    {r.client_full_name}
                  </Link>
                  <span className="rounded-full bg-bad-tint px-2.5 py-0.5 text-[11px] font-semibold text-bad">
                    Eligible since {formatDate(r.retention_eligible_date)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-text-3">
                  {REASON_LABEL[r.reason] ?? r.reason} · last session {formatDate(r.last_completed_appointment)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-text-3">No clients are past their retention floor yet.</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-[13.5px] font-bold text-foreground">
          Coming up in the next 12 months ({upcoming.length})
        </h3>
        {upcoming.length ? (
          <ul className="mt-3 space-y-2">
            {upcoming.map((r) => (
              <li key={r.client_id} className="rounded-lg border border-border bg-surface-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/clients/${r.client_id}`} className="text-[13.4px] font-semibold text-foreground hover:text-brand-ink">
                    {r.client_full_name}
                  </Link>
                  <span className="rounded-full bg-warn-tint px-2.5 py-0.5 text-[11px] font-semibold text-warn">
                    Eligible {formatDate(r.retention_eligible_date)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-text-3">
                  {REASON_LABEL[r.reason] ?? r.reason} · last session {formatDate(r.last_completed_appointment)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-text-3">Nothing reaches its retention floor in the next year.</p>
        )}
      </div>
    </div>
  );
}
