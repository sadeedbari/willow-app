"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function cancelMyAppointment(formData: FormData) {
  const supabase = await createClient();
  const appointmentId = formData.get("appointmentId") as string;

  const { error } = await supabase.rpc("cancel_my_appointment", {
    p_appointment_id: appointmentId,
  });

  if (error) {
    redirect(`/portal/appointments?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  revalidatePath("/portal/appointments");
  redirect("/portal/appointments?cancelled=1");
}
