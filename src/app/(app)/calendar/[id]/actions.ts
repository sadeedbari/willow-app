"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

export async function rescheduleAppointment(formData: FormData) {
  await getCurrentStaff();
  const appointmentId = formData.get("appointmentId") as string;
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
    redirect(`/calendar/${appointmentId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/calendar/${appointmentId}`);
}

export async function setAppointmentStatus(formData: FormData) {
  await getCurrentStaff();
  const appointmentId = formData.get("appointmentId") as string;
  const status = formData.get("status") as string;

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);

  if (error) {
    redirect(`/calendar/${appointmentId}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/calendar/${appointmentId}`);
}
