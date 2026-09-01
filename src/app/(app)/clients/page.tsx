import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import Link from "next/link";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-ok-tint text-ok",
  on_hold: "bg-warn-tint text-warn",
  discharged: "bg-surface-2 text-text-2",
  waitlisted: "bg-hue-cal-tint text-hue-cal",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  on_hold: "On hold",
  discharged: "Discharged",
  waitlisted: "Waitlisted",
};

export default async function ClientsPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, presenting_concern, status, payer, balance_cents")
    .order("full_name");

  const canAdd = staff.role === "practice_admin" || staff.role === "front_desk";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            Clients
          </h1>
          <p className="mt-1 text-[13.5px] text-text-2">
            {clients?.length ?? 0} total
          </p>
        </div>
        {canAdd && (
          <Link
            href="/clients/new"
            className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            + Add client
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-[13.4px]">
          <thead>
            <tr className="border-b border-border text-left text-[11.5px] font-semibold uppercase tracking-wide text-text-3">
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Presenting concern</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payer</th>
              <th className="px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {clients?.map((c) => (
              <tr
                key={c.id}
                className="border-b border-border last:border-0 hover:bg-surface-2"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/clients/${c.id}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {c.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-2">
                  {c.presenting_concern ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLE[c.status]}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-text-2">{c.payer ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {c.balance_cents > 0 ? (
                    <span className="font-semibold text-warn">
                      ${(c.balance_cents / 100).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-text-3">$0.00</span>
                  )}
                </td>
              </tr>
            ))}
            {!clients?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-text-3">
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
