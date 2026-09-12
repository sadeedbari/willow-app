"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function updateClient(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect(`/clients/${clientId}`);
  }

  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim().toLowerCase() || null;
  const { error } = await supabase
    .from("clients")
    .update({
      full_name: formData.get("fullName") as string,
      date_of_birth: (formData.get("dateOfBirth") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email,
      presenting_concern: (formData.get("presentingConcern") as string) || null,
      status: formData.get("status") as string,
      payer: (formData.get("payer") as string) || null,
      session_frequency: (formData.get("sessionFrequency") as string) || null,
      assigned_staff_id: (formData.get("assignedStaffId") as string) || null,
      default_appointment_type: (formData.get("defaultAppointmentType") as string) || null,
    })
    .eq("id", clientId);

  if (error) {
    redirect(`/clients/${clientId}?edit=1&error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}`);
}
