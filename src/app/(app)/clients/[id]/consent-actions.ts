"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

export async function sendConsentForm(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect(`/clients/${clientId}`);
  }

  const supabase = await createClient();
  const templateId = formData.get("templateId") as string;

  const { data: template } = await supabase
    .from("consent_form_templates")
    .select("title, body")
    .eq("id", templateId)
    .single();

  if (!template) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent("Template not found")}`);
  }

  const { data, error } = await supabase
    .from("consent_forms")
    .insert({
      practice_id: staff.practiceId,
      client_id: clientId,
      form_type: template.title,
      template_id: templateId,
      body_snapshot: template.body,
      status: "pending",
    })
    .select("access_token")
    .single();

  if (error || !data) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent(error?.message ?? "Could not create consent form")}`);
  }

  redirect(`/clients/${clientId}?consentToken=${data.access_token}`);
}
