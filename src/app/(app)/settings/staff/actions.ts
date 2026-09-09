"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
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
