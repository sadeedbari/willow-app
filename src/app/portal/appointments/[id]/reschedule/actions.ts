"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function rescheduleMyAppointment(formData: FormData) {
  const appointmentId = formData.get("appointmentId") as string;
  const newStartsAt = formData.get("newStartsAt") as string;

  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_my_appointment", {
    p_appointment_id: appointmentId,
    p_new_starts_at: newStartsAt,
  });

  if (error) {
    redirect(
      `/portal/appointments/${appointmentId}/reschedule?error=${encodeURIComponent(friendlyErrorMessage(error))}`
    );
  }

  revalidatePath("/portal/appointments");
  redirect("/portal/appointments?rescheduled=1");
}
