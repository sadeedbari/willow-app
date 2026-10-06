"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { verifyCurrentPassword } from "@/utils/verify-password";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PROCEDURE_VERSION } from "./procedure";

const PAGE = "/settings/emergency-access";

function fail(message: string): never {
  redirect(`${PAGE}?error=${encodeURIComponent(message)}`);
}

export async function saveEmergencyContact(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") redirect("/settings");

  const fullName = ((formData.get("fullName") as string) ?? "").trim();
  const email = ((formData.get("email") as string) ?? "").trim();
  const phone = ((formData.get("phone") as string) ?? "").trim();
  const relationship = ((formData.get("relationship") as string) ?? "").trim();
  const agreed = formData.get("agree") === "on";
  const password = (formData.get("currentPassword") as string) ?? "";

  if (!fullName || !email || !phone || !relationship) fail("Fill in all of the emergency contact fields.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Enter a valid email address for your emergency contact.");
  if (!agreed) fail("You need to confirm you've read the procedure and agree to the terms.");
  if (!(await verifyCurrentPassword(password))) fail("Current password is incorrect.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_emergency_contact", {
    p_full_name: fullName,
    p_email: email,
    p_phone: phone,
    p_relationship: relationship,
    p_procedure_version: PROCEDURE_VERSION,
  });
  if (error) fail(friendlyErrorMessage(error));

  revalidatePath(PAGE);
  redirect(`${PAGE}?saved=1`);
}

export async function removeEmergencyContact(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") redirect("/settings");

  const password = (formData.get("currentPassword") as string) ?? "";
  if (!(await verifyCurrentPassword(password))) fail("Current password is incorrect.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_emergency_contact");
  if (error) fail(friendlyErrorMessage(error));

  revalidatePath(PAGE);
  redirect(`${PAGE}?removed=1`);
}
