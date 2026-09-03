import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { redirect } from "next/navigation";
import { getPracticeOverviewData } from "../data";

export async function GET() {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const data = await getPracticeOverviewData(supabase, staff.id);

  const lines = [
    "Practice Overview Report",
    `Practice,${staff.practiceName}`,
    `Generated,${new Date().toISOString().slice(0, 10)}`,
    "",
    "Revenue by month",
    "Month,Billed",
    ...data.revenueByMonth.map((m) => `${m.label},${(m.cents / 100).toFixed(2)}`),
    "",
    "Session mix (last 30 days)",
    "Type,Share",
    ...data.sessionMix.map((s) => `${s.label},${s.pct}%`),
    "",
    "Summary",
    `Active clients,${data.activeClientCount}`,
    `New clients this month,${data.newClientsThisMonth}`,
    `Net caseload change this month,${data.netCaseloadChange}`,
    `Utilization (last 30 days),${data.utilizationPct ?? "N/A"}`,
    `No-show/cancellation rate (last 30 days),${data.noShowRatePct ?? "N/A"}`,
    `Notes compliance (last 30 days),${data.notesCompliancePct ?? "N/A"}`,
    `Notes unsigned >48h,${data.overdueNotesCount}`,
    `Outstanding balance,${(data.outstandingBalanceCents / 100).toFixed(2)}`,
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="practice-overview-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
