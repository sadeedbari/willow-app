"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { sendAppointmentRescheduledEmail } from "@/utils/appointment-email";

export async function rescheduleMyAppointment(formData: FormData) {
  const appointmentId = formData.get("appointmentId") as string;
  const newStartsAt = formData.get("newStartsAt") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reschedule_my_appointment", {
    p_appointment_id: appointmentId,
    p_new_starts_at: newStartsAt,
  });

  if (error) {
    redirect(
      `/portal/appointments/${appointmentId}/reschedule?error=${encodeURIComponent(friendlyErrorMessage(error))}`
    );
  }

  if (data) {
    await sendAppointmentRescheduledEmail({
      clientEmail: data.clientEmail,
      clientName: data.clientName,
      staffName: data.staffName,
      practiceName: data.practiceName,
      practiceLogoUrl: data.logoUrl,
      startsAt: data.startsAt,
      type: data.type,
      locationType: data.locationType,
      videoClientUrl: data.videoClientUrl,
    });
  }

  revalidatePath("/portal/appointments");
  redirect("/portal/appointments?rescheduled=1");
}
