"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { sendAppointmentConfirmationEmail } from "@/utils/appointment-email";

export async function createAppointment(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const durationMinutes = Number(formData.get("duration"));
  const startsAt = new Date(`${date}T${time}`);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
  const type = formData.get("type") as string;
  const locationType = formData.get("locationType") as string;
  const clientId = formData.get("clientId") as string;

  const staffId =
    staff.role === "clinician" ? staff.id : (formData.get("staffId") as string);

  const { error } = await supabase.from("appointments").insert({
    practice_id: staff.practiceId,
    client_id: clientId,
    staff_id: staffId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    type,
    location_type: locationType,
  });

  if (error) {
    redirect(`/calendar/new?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  const [{ data: client }, { data: clinician }] = await Promise.all([
    supabase.from("clients").select("full_name, email").eq("id", clientId).single(),
    supabase.from("staff").select("full_name").eq("id", staffId).single(),
  ]);

  if (client) {
    await sendAppointmentConfirmationEmail({
      clientEmail: client.email,
      clientName: client.full_name,
      staffName: clinician?.full_name ?? null,
      practiceName: staff.practiceName,
      startsAt: startsAt.toISOString(),
      type,
      locationType,
    });
  }

  redirect("/calendar");
}
