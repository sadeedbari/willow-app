import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:shadow-md">
      <div className="text-[12.5px] font-semibold text-text-2">{label}</div>
      <div className="mt-1 text-[26px] font-bold tracking-tight tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function DashboardPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [{ count: clientCount }, { count: weekApptCount }, { count: draftNoteCount }] =
    await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("starts_at", now.toISOString())
        .lte("starts_at", weekFromNow.toISOString()),
      supabase.from("session_notes").select("id", { count: "exact", head: true }).eq("status", "draft"),
    ]);

  const firstName = staff.fullName.split(" ")[0];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">
          Good to see you, {firstName}
        </h1>
        <p className="mt-1 text-[13.5px] text-text-2">{staff.practiceName}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active clients" value={clientCount ?? 0} href="/clients" />
        <StatCard label="Sessions this week" value={weekApptCount ?? 0} href="/calendar" />
        <StatCard label="Notes due" value={draftNoteCount ?? 0} href="/notes" />
      </div>
    </div>
  );
}
