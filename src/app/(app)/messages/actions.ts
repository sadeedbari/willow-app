"use server";

import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

export async function startConversation(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "clinician" && staff.role !== "front_desk") {
    redirect("/messages");
  }
  if (!clientId) redirect("/messages?new=1");

  redirect(`/messages/${clientId}`);
}
