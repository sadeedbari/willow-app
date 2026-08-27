"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

export async function createAppointment(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const durationMinutes = Number(formData.get("duration"));
  const startsAt = new Date(`${date}T${time}`);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  const staffId =
    staff.role === "clinician" ? staff.id : (formData.get("staffId") as string);

  const { error } = await supabase.from("appointments").insert({
    practice_id: staff.practiceId,
    client_id: formData.get("clientId") as string,
    staff_id: staffId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    type: formData.get("type") as string,
    location_type: formData.get("locationType") as string,
  });

  if (error) {
    redirect(`/calendar/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/calendar");
}
