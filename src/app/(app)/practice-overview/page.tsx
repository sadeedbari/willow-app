import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { redirect } from "next/navigation";

export default async function PracticeOverviewPage() {
  const staff = await getCurrentStaff();

  if (staff.role !== "practice_admin") {
    redirect("/dashboard");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">
          Practice Overview
        </h1>
        <p className="mt-1 text-[13.5px] text-text-2">
          A higher-level view of how {staff.practiceName} is doing.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="text-[15px] font-bold text-foreground">Coming soon</div>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-text-2">
          This page is reserved for practice-wide reporting — planned for a future pass:
        </p>
        <ul className="mx-auto mt-4 max-w-sm space-y-1.5 text-left text-[13px] text-text-2">
          <li>· Revenue trend and outstanding balances</li>
          <li>· Client status breakdown (active / on hold / waitlisted)</li>
          <li>· Needs-attention alerts (overdue notes, expiring licenses, overdue invoices)</li>
          <li>· Session notes compliance rate</li>
        </ul>
      </div>
    </div>
  );
}
