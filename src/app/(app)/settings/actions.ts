"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function updatePracticeSettings(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("practices")
    .update({
      name: formData.get("name") as string,
      business_number: (formData.get("businessNumber") as string) || null,
      primary_contact_email: (formData.get("contactEmail") as string) || null,
      primary_contact_phone: (formData.get("contactPhone") as string) || null,
    })
    .eq("id", staff.practiceId);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect("/settings?saved=1");
}
