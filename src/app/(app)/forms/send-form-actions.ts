"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createAndSendConsentForm } from "@/utils/consent-form";

export async function sendFormToClient(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect("/forms");
  }

  const clientId = formData.get("clientId") as string;
  const templateId = formData.get("templateId") as string;
  const supabase = await createClient();

  const result = await createAndSendConsentForm(supabase, {
    practiceId: staff.practiceId,
    practiceName: staff.practiceName,
    clientId,
    templateId,
  });

  if (!result.ok) {
    redirect(`/forms?send=1&error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/forms?sent=${result.emailed ? "1" : "nomail"}`);
}
