"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createAndSendConsentForm } from "@/utils/consent-form";

export async function sendConsentForm(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect(`/clients/${clientId}`);
  }

  const supabase = await createClient();
  const templateId = formData.get("templateId") as string;

  const result = await createAndSendConsentForm(supabase, {
    practiceId: staff.practiceId,
    practiceName: staff.practiceName,
    practiceLogoUrl: staff.practiceLogoUrl,
    clientId,
    templateId,
  });

  if (!result.ok) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/clients/${clientId}?consentToken=${result.accessToken}`);
}
