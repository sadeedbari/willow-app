import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";
import { getDashboardData } from "./data";
import { getThreadList } from "../messages/data";
import { avatarColorFor, initialsOf } from "@/utils/avatar-color";
import { APPOINTMENT_TYPE_SHORT_LABEL } from "@/utils/appointment-type-label";
import { DISPLAY_TIME_ZONE } from "@/utils/timezone";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  label,
  value,
  trend,
  trendTone = "muted",
  icon,
  iconColor,
}: {
  label: string;
  value: string | number;
  trend?: string;
  trendTone?: "up" | "down" | "muted";
  icon: React.ReactNode;
  iconColor: string;
}) {
  const trendClass =
    trendTone === "up" ? "text-ok" : trendTone === "down" ? "text-bad" : "text-text-3";
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-text-2">{label}</span>
        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${iconColor}`}>
          {icon}
        </span>
      </div>
      <div className="mt-2 text-[26px] font-bold tracking-tight tabular-nums text-foreground">{value}</div>
      {trend && <div className={`mt-1 text-[12px] font-semibold ${trendClass}`}>{trend}</div>}
    </div>
  );
}

// "Dr. Naomi Osei" -> "Dr. Osei" (not just "Dr."); "Naomi Osei" -> "Naomi".
function greetingName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length > 1 && /^(dr|mr|mrs|ms|mx|miss|prof)\.?$/i.test(parts[0])) {
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }
  return parts[0];
}

export default async function DashboardPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const [data, threads] = await Promise.all([
    getDashboardData(supabase, staff.id, staff.role),
    getThreadList(supabase),
  ]);

  const firstName = greetingName(staff.fullName);
  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: DISPLAY_TIME_ZONE });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-1.5 text-[13.5px] font-semibold text-text-2">
        {greeting()}, {firstName}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground sm:text-[26px]">{dateLabel}</h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            You have <b className="text-foreground">{data.todayAppointments.length}</b> session
            {data.todayAppointments.length === 1 ? "" : "s"} today ·{" "}
            <b className="text-foreground">{data.notesDueCount}</b> note{data.notesDueCount === 1 ? "" : "s"} due ·{" "}
            <b className="text-foreground">{data.pendingConsentCount}</b> consent form
            {data.pendingConsentCount === 1 ? "" : "s"} awaiting signature
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/notes/new"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-[13.4px] font-semibold text-text-2 transition hover:bg-surface-2 sm:flex-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 flex-none">
              <path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
            </svg>
            Write a note
          </Link>
          <Link
            href="/calendar/new"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink sm:flex-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-3.5 w-3.5 flex-none">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Appointment
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label="Active caseload"
          value={data.activeClientCount}
          trend={data.newClientsThisMonth > 0 ? `↑ ${data.newClientsThisMonth} this month` : undefined}
          trendTone="up"
          iconColor="bg-hue-clients-tint text-hue-clients"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
            </svg>
          }
        />
        <StatCard
          label="Sessions this week"
          value={data.weekSessionCount}
          trend={data.weeklyUtilizationPct !== null ? `${data.weeklyUtilizationPct}% utilization` : undefined}
          iconColor="bg-hue-cal-tint text-hue-cal"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M3 10h18" />
            </svg>
          }
        />
        <StatCard
          label="Notes due"
          value={data.notesDueCount}
          trend={data.oldestDueNote ? `${data.oldestDueNote.client_name} · ${data.oldestDueNote.when}` : undefined}
          trendTone="down"
          iconColor="bg-hue-notes-tint text-hue-notes"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
            </svg>
          }
        />
        <StatCard
          label={`Collected (${today.toLocaleDateString(undefined, { month: "short", timeZone: DISPLAY_TIME_ZONE })})`}
          value={`$${(data.collectedThisMonthCents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          trend={
            data.collectedChangePct !== null
              ? `${data.collectedChangePct >= 0 ? "↑" : "↓"} ${Math.abs(data.collectedChangePct)}% vs last month`
              : undefined
          }
          trendTone={data.collectedChangePct !== null && data.collectedChangePct < 0 ? "down" : "up"}
          iconColor="bg-hue-bill-tint text-hue-bill"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
            </svg>
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[14.5px] font-bold text-foreground">Today&apos;s schedule</h2>
            <Link href="/calendar" className="text-[12.5px] font-semibold text-brand-ink">
              Open calendar →
            </Link>
          </div>
          <div className="mt-2">
            {data.todayAppointments.length ? (
              data.todayAppointments.map((a) => {
                const color = avatarColorFor(a.client_id);
                const time = new Date(a.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZone: DISPLAY_TIME_ZONE });
                const typeLabel = `${APPOINTMENT_TYPE_SHORT_LABEL[a.type] ?? a.type} · ${a.location_type === "telehealth" ? "Telehealth" : "Office"}`;
                return (
                  <div key={a.id} className="flex items-center gap-3.5 border-b border-border py-2.5 last:border-0">
                    <div className="w-[68px] flex-none text-[12.5px] font-semibold text-text-3">{time}</div>
                    <span
                      className={`flex h-8.5 w-8.5 flex-none items-center justify-center rounded-full text-[11.5px] font-bold ${color.bg} ${color.text}`}
                    >
                      {initialsOf(a.clients?.full_name ?? "?")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.6px] font-semibold text-foreground">{a.clients?.full_name ?? "Unknown client"}</div>
                      <div className="text-[11.8px] text-text-3">
                        {typeLabel}
                        {staff.role !== "clinician" && a.staff?.full_name ? ` · ${a.staff.full_name}` : ""}
                      </div>
                    </div>
                    <Link
                      href={`/calendar/${a.id}`}
                      className="flex-none rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-text-2 transition hover:bg-surface-2"
                    >
                      Details
                    </Link>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-[13px] text-text-3">No sessions scheduled today.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-[14.5px] font-bold text-foreground">Needs attention</h2>
            <div className="mt-2">
              {data.attentionItems.length ? (
                data.attentionItems.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-start gap-2.5 border-b border-border py-2.5 last:border-0 hover:opacity-80"
                  >
                    <span
                      className={`mt-0.5 flex-none rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
                        item.kind === "consent" ? "bg-warn-tint text-warn" : "bg-bad-tint text-bad"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[13px] text-foreground">{item.text}</span>
                  </Link>
                ))
              ) : (
                <p className="py-6 text-center text-[13px] text-text-3">You&apos;re all caught up!</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-[14.5px] font-bold text-foreground">Recent messages</h2>
              <Link href="/messages" className="text-[12.5px] font-semibold text-brand-ink">
                Inbox →
              </Link>
            </div>
            <div className="mt-2">
              {threads.length ? (
                threads.slice(0, 3).map((t) => {
                  const color = avatarColorFor(t.client_id);
                  return (
                    <Link
                      key={t.id}
                      href={`/messages/${t.client_id}`}
                      className="flex items-center gap-2.5 border-b border-border py-2 last:border-0 hover:opacity-80"
                    >
                      <span
                        className={`flex h-7.5 w-7.5 flex-none items-center justify-center rounded-full text-[10.5px] font-bold ${color.bg} ${color.text}`}
                      >
                        {initialsOf(t.clients?.full_name ?? "?")}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[12.8px] font-semibold text-foreground">{t.clients?.full_name ?? "Unknown client"}</div>
                        <div className="truncate text-[11.8px] text-text-3">{t.preview}</div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="py-6 text-center text-[13px] text-text-3">No messages yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
