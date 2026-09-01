"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

export async function updateDefaultAppointmentType(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect(`/clients/${clientId}`);
  }

  const supabase = await createClient();
  const value = formData.get("defaultAppointmentType") as string;

  await supabase
    .from("clients")
    .update({ default_appointment_type: value || null })
    .eq("id", clientId);

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}
