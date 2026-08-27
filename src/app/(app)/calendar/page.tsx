import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

type ApptRow = {
  id: string;
  starts_at: string;
  type: string;
  location_type: string;
  status: string;
  clients: { full_name: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  couples: "Couples",
  family: "Family",
  intake: "Intake",
  group: "Group",
};

export default async function CalendarPage() {
  const supabase = await createClient();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data } = await supabase
    .from("appointments")
    .select("id, starts_at, type, location_type, status, clients(full_name)")
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString())
    .neq("status", "cancelled")
    .order("starts_at");

  const appointments = (data ?? []) as unknown as ApptRow[];

  const byDay = new Map<string, ApptRow[]>();
  for (const a of appointments) {
    const key = new Date(a.starts_at).toDateString();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(a);
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    return { date: d, key: d.toDateString(), appts: byDay.get(d.toDateString()) ?? [] };
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Calendar
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">Next 7 days</p>
        </div>
        <Link
          href="/calendar/new"
          className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
        >
          + New appointment
        </Link>
      </div>

      <div className="space-y-4">
        {days.map(({ date, key, appts }) => (
          <div key={key} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="mb-3 text-[13px] font-bold text-foreground">
              {date.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </div>
            {appts.length ? (
              <ul className="space-y-2">
                {appts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-[13.4px]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-16 flex-none font-semibold tabular-nums text-foreground">
                        {new Date(a.starts_at).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-foreground">
                        {a.clients?.full_name ?? "Unknown client"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-text-3">
                      <span>{TYPE_LABEL[a.type] ?? a.type}</span>
                      {a.location_type === "telehealth" && (
                        <span className="rounded-full bg-hue-cal-tint px-2 py-0.5 text-[11px] font-semibold text-hue-cal">
                          Telehealth
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-text-3">No appointments.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
