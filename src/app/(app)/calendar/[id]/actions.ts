"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function rescheduleAppointment(formData: FormData) {
  await getCurrentStaff();
  const appointmentId = formData.get("appointmentId") as string;
  const returnTo = formData.get("returnTo") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const durationMinutes = Number(formData.get("duration"));

  const startsAt = new Date(`${date}T${time}`);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() })
    .eq("id", appointmentId);

  if (error) {
    redirect(`${returnTo}&error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect(returnTo);
}

export async function setAppointmentStatus(formData: FormData) {
  await getCurrentStaff();
  const appointmentId = formData.get("appointmentId") as string;
  const returnTo = formData.get("returnTo") as string;
  const status = formData.get("status") as string;

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);

  if (error) {
    redirect(`${returnTo}&error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect(returnTo);
}
