"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function createNote(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const sign = formData.get("intent") === "sign";

  const { error } = await supabase.from("session_notes").insert({
    practice_id: staff.practiceId,
    client_id: formData.get("clientId") as string,
    staff_id: staff.id,
    session_date: formData.get("sessionDate") as string,
    subjective: formData.get("subjective") as string,
    objective: formData.get("objective") as string,
    assessment: formData.get("assessment") as string,
    plan: formData.get("plan") as string,
    status: sign ? "signed" : "draft",
    signed_at: sign ? new Date().toISOString() : null,
  });

  if (error) {
    redirect(`/notes/new?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect("/notes");
}
