"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function revokeInvitation(invitationId: string) {
  const supabase = await createClient();
  await supabase
    .from("staff_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);
  revalidatePath("/settings/staff");
}

async function countActivePracticeAdmins(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count } = await supabase
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("role", "practice_admin")
    .eq("active", true);
  return count ?? 0;
}

export async function updateStaffRole(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings/staff");
  }

  const targetId = formData.get("staffId") as string;
  const newRole = formData.get("role") as string;

  if (targetId === staff.id) {
    redirect(`/settings/staff?error=${encodeURIComponent("You can't change your own role here.")}`);
  }

  const supabase = await createClient();
  const { data: target } = await supabase.from("staff").select("role").eq("id", targetId).single();

  // Changing the practice's last active admin away from practice_admin would
  // lock everyone out of admin functions -- there'd be no one left who could
  // even undo it.
  if (target?.role === "practice_admin" && newRole !== "practice_admin" && (await countActivePracticeAdmins(supabase)) <= 1) {
    redirect(`/settings/staff?error=${encodeURIComponent("This is the only Practice Admin — promote someone else first.")}`);
  }

  await supabase.from("staff").update({ role: newRole }).eq("id", targetId);
  revalidatePath("/settings/staff");
  redirect("/settings/staff?updated=1");
}

export async function offboardStaff(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings/staff");
  }

  const targetId = formData.get("staffId") as string;
  const reassignToId = (formData.get("reassignToId") as string) || null;

  if (targetId === staff.id) {
    redirect(`/settings/staff/${targetId}/offboard?error=${encodeURIComponent("You can't offboard your own account.")}`);
  }

  const supabase = await createClient();
  const { data: target } = await supabase.from("staff").select("role").eq("id", targetId).single();

  if (target?.role === "practice_admin" && (await countActivePracticeAdmins(supabase)) <= 1) {
    redirect(
      `/settings/staff/${targetId}/offboard?error=${encodeURIComponent("This is the only Practice Admin — promote someone else first.")}`
    );
  }

  const { count: clientCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("assigned_staff_id", targetId);

  if ((clientCount ?? 0) > 0 && !reassignToId) {
    redirect(
      `/settings/staff/${targetId}/offboard?error=${encodeURIComponent("Choose someone to reassign their clients to first.")}`
    );
  }

  if (reassignToId) {
    await supabase.from("clients").update({ assigned_staff_id: reassignToId }).eq("assigned_staff_id", targetId);
  }

  // Deactivate rather than delete -- every table that references a staff
  // member (appointments, notes, invoices, messages...) has no cascade, by
  // design, so their historical work stays attributed to them. `active`
  // already gates every RLS-backed function (my_practice_id/my_role/
  // my_staff_id), so this alone fully revokes their access.
  await supabase.from("staff").update({ active: false }).eq("id", targetId);

  revalidatePath("/settings/staff");
  redirect("/settings/staff?offboarded=1");
}

export async function reactivateStaff(staffId: string) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings/staff");
  }
  const supabase = await createClient();
  await supabase.from("staff").update({ active: true }).eq("id", staffId);
  revalidatePath("/settings/staff");
}

// Per-account exemption from the site-wide "every staff account should have
// MFA" policy -- doesn't change the login flow itself (setup has always been
// skippable for anyone, every login, regardless of this flag). It only
// changes how that account's own Security page describes the policy to
// them, and lets a practice that's decided MFA isn't mandatory for a given
// role record that decision explicitly instead of it just being implicit.
export async function toggleStaffMfaRequired(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings/staff");
  }

  const targetId = formData.get("staffId") as string;
  if (targetId === staff.id) {
    redirect(`/settings/staff?error=${encodeURIComponent("You can't change this for your own account here.")}`);
  }

  const supabase = await createClient();
  const { data: target } = await supabase.from("staff").select("mfa_required").eq("id", targetId).single();
  if (!target) {
    redirect("/settings/staff");
  }

  await supabase.from("staff").update({ mfa_required: !target.mfa_required }).eq("id", targetId);

  revalidatePath("/settings/staff");
  redirect("/settings/staff");
}

export async function resetStaffMfa(staffId: string) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings/staff");
  }

  const supabase = await createClient();
  const { data: target } = await supabase.from("staff").select("user_id").eq("id", staffId).single();
  if (!target) {
    redirect(`/settings/staff?error=${encodeURIComponent("Staff member not found")}`);
  }

  // Marks the audit_log entry and confirms staffId belongs to this practice
  // before we touch anything via the service-role client below.
  const { error } = await supabase.rpc("log_staff_mfa_reset", { p_target_staff_id: staffId });
  if (error) {
    redirect(`/settings/staff?error=${encodeURIComponent(error.message)}`);
  }

  const admin = createServiceRoleClient();
  const { data: factorsData } = await admin.auth.admin.mfa.listFactors({ userId: target.user_id });
  for (const factor of factorsData?.factors ?? []) {
    await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: target.user_id });
  }

  revalidatePath("/settings/staff");
  redirect("/settings/staff?mfaReset=1");
}
