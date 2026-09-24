import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { revokeInvitation, updateStaffRole, reactivateStaff, resetStaffMfa, toggleStaffMfaRequired } from "./actions";
import { SettingsTabs } from "../tabs";
import Link from "next/link";
import { getStaffLimit, UPGRADE_CONTACT_EMAIL } from "@/utils/staff-limits";

const ROLE_LABEL: Record<string, string> = {
  practice_admin: "Practice Admin",
  clinician: "Clinician",
  front_desk: "Front Desk",
  billing_admin: "Billing Admin",
};

const ROLE_OPTIONS = ["clinician", "front_desk", "billing_admin", "practice_admin"] as const;

function initialsOf(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string; offboarded?: string; mfaReset?: string }>;
}) {
  const { error, updated, offboarded, mfaReset } = await searchParams;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: allStaff } = await supabase
    .from("staff")
    .select("id, full_name, role, email, active, mfa_required")
    .order("full_name");

  const team = allStaff?.filter((s) => s.active) ?? [];
  const inactiveTeam = allStaff?.filter((s) => !s.active) ?? [];

  const { data: invitations } =
    staff.role === "practice_admin"
      ? await supabase
          .from("staff_invitations")
          .select("id, email, full_name, role, status, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : { data: null };

  const { data: practice } = await supabase
    .from("practices")
    .select("subscription_plan")
    .eq("id", staff.practiceId)
    .single();

  const staffLimit = getStaffLimit(practice?.subscription_plan ?? null);
  const staffCount = team.length + (invitations?.length ?? 0);
  const atStaffLimit = staffCount >= staffLimit;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-[13.5px] text-text-2">{team.length} team members</p>
      </div>

      <SettingsTabs active="/settings/staff" />

      {error && (
        <p className="mb-4 rounded-lg bg-bad-tint px-3 py-2 text-[13px] text-bad">{decodeURIComponent(error)}</p>
      )}
      {updated && <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">Role updated.</p>}
      {offboarded && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">Team member offboarded.</p>
      )}
      {mfaReset && (
        <p className="mb-4 rounded-lg bg-ok-tint px-3 py-2 text-[13px] text-ok">
          Two-factor authentication reset — they&apos;ll set it up again next time they log in.
        </p>
      )}

      {staff.role === "practice_admin" && (
        <div className="mb-6 flex items-center justify-between gap-3">
          {atStaffLimit ? (
            <p className="text-[12.5px] text-text-2">
              You&apos;ve reached your plan&apos;s limit of {staffLimit} staff account{staffLimit === 1 ? "" : "s"}.{" "}
              {staffLimit === 1 ? (
                <Link href="/settings/billing" className="font-semibold text-brand-ink hover:underline">
                  Upgrade to the Team plan
                </Link>
              ) : (
                <>
                  Contact Sulo Systems at{" "}
                  <a href={`mailto:${UPGRADE_CONTACT_EMAIL}`} className="font-semibold text-brand-ink hover:underline">
                    {UPGRADE_CONTACT_EMAIL}
                  </a>
                </>
              )}{" "}
              to add more.
            </p>
          ) : (
            <span />
          )}
          {atStaffLimit ? (
            <span
              aria-disabled="true"
              className="cursor-not-allowed rounded-lg bg-surface-2 px-3.5 py-2 text-[13.4px] font-semibold text-text-3"
            >
              + Invite team member
            </span>
          ) : (
            <Link
              href="/settings/staff/invite"
              className="rounded-lg bg-brand px-3.5 py-2 text-[13.4px] font-semibold text-white transition hover:bg-brand-ink"
            >
              + Invite team member
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {team.map((s) => {
          const isSelf = s.id === staff.id;
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand to-hue-cal text-[14px] font-bold text-white">
                  {initialsOf(s.full_name)}
                </div>
                {isSelf && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-text-3">
                    You
                  </span>
                )}
              </div>
              <div className="mt-3 text-[14px] font-semibold text-foreground">{s.full_name}</div>

              {staff.role === "practice_admin" && !isSelf ? (
                <form action={updateStaffRole} className="mt-2 flex items-center gap-2">
                  <input type="hidden" name="staffId" value={s.id} />
                  <select
                    name="role"
                    defaultValue={s.role}
                    className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[12.5px] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg border border-border px-2.5 py-1.5 text-[11.5px] font-semibold text-text-2 transition hover:bg-surface-2"
                  >
                    Save
                  </button>
                </form>
              ) : (
                <div className="text-[12.5px] text-text-3">{ROLE_LABEL[s.role]}</div>
              )}

              {!s.mfa_required && (
                <span className="mt-2 inline-flex rounded-full bg-warn-tint px-2 py-0.5 text-[10.5px] font-semibold text-warn">
                  MFA optional
                </span>
              )}

              {staff.role === "practice_admin" && !isSelf && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/settings/staff/${s.id}/offboard`}
                    className="text-[11.5px] font-semibold text-bad"
                  >
                    Offboard
                  </Link>
                  <form action={resetStaffMfa.bind(null, s.id)}>
                    <button type="submit" className="text-[11.5px] font-semibold text-text-2 hover:text-foreground">
                      Reset MFA
                    </button>
                  </form>
                  <form action={toggleStaffMfaRequired}>
                    <input type="hidden" name="staffId" value={s.id} />
                    <button type="submit" className="text-[11.5px] font-semibold text-text-2 hover:text-foreground">
                      {s.mfa_required ? "Make MFA optional" : "Require MFA"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
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

      {staff.role === "practice_admin" && inactiveTeam.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 text-[15px] font-bold text-foreground">Offboarded</div>
          <div className="space-y-2">
            {inactiveTeam.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 opacity-70"
              >
                <div>
                  <div className="text-[13.4px] font-semibold text-foreground">{s.full_name}</div>
                  <div className="text-[11.5px] text-text-3">{ROLE_LABEL[s.role]}</div>
                </div>
                <form action={reactivateStaff.bind(null, s.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-text-2 transition hover:bg-surface-2"
                  >
                    Reactivate
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
