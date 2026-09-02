"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

export async function updateTemplate(formData: FormData) {
  const staff = await getCurrentStaff();
  const templateId = formData.get("templateId") as string;
  if (staff.role !== "practice_admin") {
    redirect("/forms");
  }

  const supabase = await createClient();
  await supabase
    .from("consent_form_templates")
    .update({
      title: formData.get("title") as string,
      body: formData.get("body") as string,
      active: formData.get("active") === "on",
    })
    .eq("id", templateId);

  redirect(`/forms/${templateId}`);
}

export async function deleteTemplate(formData: FormData) {
  const staff = await getCurrentStaff();
  const templateId = formData.get("templateId") as string;
  if (staff.role !== "practice_admin") {
    redirect("/forms");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("consent_form_templates").delete().eq("id", templateId);

  if (error) {
    redirect(
      `/forms/${templateId}?error=${encodeURIComponent(
        "Can't delete a template that's already been sent to a client — mark it inactive instead."
      )}`
    );
  }

  redirect("/forms");
}
