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

export default async function PracticeOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ staffId?: string }>;
}) {
  const { staffId } = await searchParams;
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const [data, { count: activeStaffCount }, { data: clinicians }] = await Promise.all([
    getPracticeOverviewData(supabase, staff.id, staffId || undefined),
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
            href={`/practice-overview/export${staffId ? `?staffId=${staffId}` : ""}`}
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
    </div>
  );
}
