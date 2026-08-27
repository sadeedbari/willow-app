"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function createTemplate(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/consent-templates");
  }

  const title = formData.get("title") as string;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("consent_form_templates")
    .insert({
      practice_id: staff.practiceId,
      slug: `${slugify(title)}_${Date.now().toString(36)}`,
      title,
      body: formData.get("body") as string,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/consent-templates/new?error=${encodeURIComponent(error?.message ?? "Could not create template")}`);
  }

  redirect(`/consent-templates/${data.id}`);
}
