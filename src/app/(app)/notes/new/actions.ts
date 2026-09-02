"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function createNote(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const sign = formData.get("intent") === "sign";
  const appointmentId = (formData.get("appointmentId") as string) || null;
  const riskLevel = formData.get("riskLevel") as string;
  const riskNotes = (formData.get("riskNotes") as string) || "";

  if (riskLevel !== "none" && !riskNotes.trim()) {
    const backTo = appointmentId
      ? `/notes/new?appointmentId=${appointmentId}`
      : `/notes/new?clientId=${formData.get("clientId")}`;
    redirect(
      `${backTo}&error=${encodeURIComponent(
        "Describe the risk and safety plan before saving — required whenever risk assessment isn't \"None identified.\""
      )}`
    );
  }

  const { error } = await supabase.from("session_notes").insert({
    practice_id: staff.practiceId,
    client_id: formData.get("clientId") as string,
    staff_id: staff.id,
    appointment_id: appointmentId,
    session_date: formData.get("sessionDate") as string,
    subjective: formData.get("subjective") as string,
    objective: formData.get("objective") as string,
    assessment: formData.get("assessment") as string,
    plan: formData.get("plan") as string,
    risk_level: riskLevel,
    risk_notes: riskNotes || null,
    status: sign ? "signed" : "draft",
    signed_at: sign ? new Date().toISOString() : null,
  });

  if (error) {
    redirect(`/notes/new?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect("/notes");
}
