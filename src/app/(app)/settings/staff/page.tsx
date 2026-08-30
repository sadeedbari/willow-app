import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { revokeInvitation } from "./actions";
import { SettingsTabs } from "../tabs";
import Link from "next/link";

const ROLE_LABEL: Record<string, string> = {
  practice_admin: "Practice Admin",
  clinician: "Clinician",
  front_desk: "Front Desk",
  billing_admin: "Billing Admin",
};

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default async function StaffPage() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("staff")
    .select("id, full_name, role, email")
    .order("full_name");

  const { data: invitations } =
    staff.role === "practice_admin"
      ? await supabase
          .from("staff_invitations")
          .select("id, email, full_name, role, status, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : { data: null };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-2">{team?.length ?? 0} team members</p>
      </div>

      <SettingsTabs active="/settings/staff" />

      <div className="mb-6 flex justify-end">
        {staff.role === "practice_admin" && (
          <Link
            href="/settings/staff/invite"
            className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
          >
            + Invite team member
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {team?.map((s) => (
          <div key={s.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-hue-cal text-[14px] font-bold text-white">
              {initialsOf(s.full_name)}
            </div>
            <div className="mt-3 text-[14px] font-semibold text-foreground">
              {s.full_name}
            </div>
            <div className="text-[12.5px] text-text-3">{ROLE_LABEL[s.role]}</div>
          </div>
        ))}
      </div>

      {staff.role === "practice_admin" && (
        <div className="mt-8">
          <div className="mb-3 text-[15px] font-bold text-foreground">
            Pending invitations
          </div>
          {invitations?.length ? (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <div>
                    <div className="text-[13.4px] font-semibold text-foreground">
                      {inv.full_name}{" "}
                      <span className="font-normal text-text-3">· {inv.email}</span>
                    </div>
                    <div className="text-[11.5px] text-text-3">
                      {ROLE_LABEL[inv.role]} · Invited{" "}
                      {new Date(inv.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <form action={revokeInvitation.bind(null, inv.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-text-2 transition hover:bg-surface-2"
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-text-3">No pending invitations.</p>
          )}
        </div>
      )}
    </div>
  );
}
