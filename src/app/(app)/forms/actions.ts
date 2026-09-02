"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { STARTER_TEMPLATES } from "./starter-templates";

export async function loadStarterTemplates() {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/forms");
  }

  const supabase = await createClient();
  await supabase
    .from("consent_form_templates")
    .upsert(
      STARTER_TEMPLATES.map((t) => ({ ...t, practice_id: staff.practiceId })),
      { onConflict: "practice_id,slug", ignoreDuplicates: true }
    );

  redirect("/forms");
}
