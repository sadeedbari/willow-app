"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { sendAppointmentCancelledEmail } from "@/utils/appointment-email";

export async function cancelMyAppointment(formData: FormData) {
  const supabase = await createClient();
  const appointmentId = formData.get("appointmentId") as string;

  const { data, error } = await supabase.rpc("cancel_my_appointment", {
    p_appointment_id: appointmentId,
  });

  if (error) {
    redirect(`/portal/appointments?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  if (data) {
    await sendAppointmentCancelledEmail({
      clientEmail: data.clientEmail,
      clientName: data.clientName,
      staffName: data.staffName,
      practiceName: data.practiceName,
      startsAt: data.startsAt,
      type: data.type,
      locationType: data.locationType,
      videoClientUrl: data.videoClientUrl,
    });
  }

  revalidatePath("/portal/appointments");
  redirect("/portal/appointments?cancelled=1");
}
