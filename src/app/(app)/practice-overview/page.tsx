import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { redirect } from "next/navigation";
import { getPracticeOverviewData } from "./data";
import { RevenueChart } from "./revenue-chart";
import { SessionMixChart } from "./session-mix-chart";

function StatCard({
  label,
  value,
  trend,
  trendTone = "muted",
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendTone?: "up" | "down" | "muted";
}) {
  const trendClass = trendTone === "up" ? "text-ok" : trendTone === "down" ? "text-bad" : "text-text-3";
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="text-[12.5px] font-semibold text-text-2">{label}</div>
      <div className="mt-1.5 text-[26px] font-bold tracking-tight tabular-nums text-foreground">{value}</div>
      {trend && <div className={`mt-1 text-[12px] font-semibold ${trendClass}`}>{trend}</div>}
    </div>
  );
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function PracticeOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ staffId?: string; year?: string }>;
}) {
  const { staffId, year: yearParam } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/dashboard");
  }

  const currentYear = new Date().getFullYear();
  const year = Number(yearParam) || currentYear;
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  const supabase = await createClient();

  const [data, { count: activeStaffCount }, { data: clinicians }] = await Promise.all([
    getPracticeOverviewData(supabase, staff.id, staffId || undefined, year),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("staff").select("id, full_name").in("role", ["clinician", "practice_admin"]).eq("active", true).order("full_name"),
  ]);

  const selectedClinicianName = staffId ? clinicians?.find((c) => c.id === staffId)?.full_name : undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">Practice Overview</h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {staff.practiceName}
            {selectedClinicianName
              ? ` · ${selectedClinicianName}`
              : (activeStaffCount ?? 0) <= 1
                ? " · Solo practice"
                : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {clinicians && clinicians.length > 1 && (
            <form method="GET" className="flex items-center gap-1.5">
              <select
                name="staffId"
                defaultValue={staffId ?? ""}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              >
                <option value="">Whole practice</option>
                {clinicians.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2">
                Go
              </button>
            </form>
          )}
          <a
            href={`/practice-overview/export?year=${year}${staffId ? `&staffId=${staffId}` : ""}`}
            className="flex w-fit items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-[13.4px] font-semibold text-text-2 transition hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 3v13m0 0-4-4m4 4 4-4M4 19h16" />
            </svg>
            Export report
          </a>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={`Practice revenue (${new Date().toLocaleDateString(undefined, { month: "short" })})`}
          value={`$${(data.revenueThisMonthCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          trend={
            data.revenueChangePct !== null
              ? `${data.revenueChangePct >= 0 ? "↑" : "↓"} ${Math.abs(data.revenueChangePct)}% vs last month`
              : undefined
          }
          trendTone={data.revenueChangePct !== null && data.revenueChangePct < 0 ? "down" : "up"}
        />
        <StatCard
          label="Active clients"
          value={data.activeClientCount}
          trend={data.newClientsThisMonth > 0 ? `↑ ${data.newClientsThisMonth} this month` : undefined}
          trendTone="up"
        />
        <StatCard
          label="Utilization"
          value={data.utilizationPct !== null ? `${data.utilizationPct}%` : "—"}
          trend="last 30 days"
        />
        <StatCard
          label="Notes compliance"
          value={data.notesCompliancePct !== null ? `${data.notesCompliancePct}%` : "—"}
          trend={data.overdueNotesCount > 0 ? `${data.overdueNotesCount} unsigned >48h` : "All caught up"}
          trendTone={data.overdueNotesCount > 0 ? "down" : "up"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="No-show / cancellation rate"
          value={data.noShowRatePct !== null ? `${data.noShowRatePct}%` : "—"}
          trend="last 30 days"
        />
        <StatCard
          label="Outstanding balance"
          value={`$${(data.outstandingBalanceCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        />
        <StatCard
          label="Net caseload change"
          value={`${data.netCaseloadChange >= 0 ? "+" : ""}${data.netCaseloadChange}`}
          trend="this month"
          trendTone={data.netCaseloadChange >= 0 ? "up" : "down"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-[14.5px] font-bold text-foreground">Revenue, last 6 months</h2>
          <div className="mt-3">
            <RevenueChart months={data.revenueByMonth} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-[14.5px] font-bold text-foreground">Session mix</h2>
          <p className="text-[11.5px] text-text-3">Last 30 days</p>
          <div className="mt-4">
            <SessionMixChart slices={data.sessionMix} />
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[14.5px] font-bold text-foreground">Sessions by client</h2>
            <p className="text-[11.5px] text-text-3">Completed sessions, by month, for {year}</p>
          </div>
          <form method="GET" className="flex items-center gap-1.5">
            {staffId && <input type="hidden" name="staffId" value={staffId} />}
            <select
              name="year"
              defaultValue={year}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border border-border px-2.5 py-1.5 text-[12.5px] font-semibold text-text-2 transition hover:bg-surface-2">
              Go
            </button>
          </form>
        </div>

        {data.sessionsByClient.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[840px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] font-semibold text-text-3">
                  <th className="py-2 pr-3">Client</th>
                  {MONTH_LABELS.map((m) => (
                    <th key={m} className="px-2 py-2 text-right">
                      {m}
                    </th>
                  ))}
                  <th className="py-2 pl-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.sessionsByClient.map((row) => (
                  <tr key={row.clientId} className="border-b border-border text-text-2 last:border-0">
                    <td className="py-2 pr-3 font-semibold text-foreground">{row.clientName}</td>
                    {row.monthly.map((count, i) => (
                      <td key={i} className="px-2 py-2 text-right tabular-nums">
                        {count > 0 ? count : "—"}
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right font-bold tabular-nums text-foreground">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-surface-2 px-3 py-6 text-center text-[13px] text-text-3">
            No completed sessions in {year}.
          </p>
        )}
      </div>
    </div>
  );
}
