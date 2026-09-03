"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function createClientRecord(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clients")
    .insert({
      practice_id: staff.practiceId,
      assigned_staff_id: (formData.get("assignedStaffId") as string) || null,
      full_name: formData.get("fullName") as string,
      date_of_birth: (formData.get("dateOfBirth") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      presenting_concern: (formData.get("presentingConcern") as string) || null,
      payer: (formData.get("payer") as string) || null,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/clients?new=1&error=${encodeURIComponent(friendlyErrorMessage(error, "Could not create client"))}`);
  }

  redirect(`/clients/${data.id}`);
}
