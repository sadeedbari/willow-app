"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { sendAppointmentConfirmationEmail } from "@/utils/appointment-email";
import { createDailyRoomWithAccessLinks } from "@/utils/daily/create-room";

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
  const returnTo = (formData.get("returnTo") as string) || "/calendar";
  const reopenHref = (formData.get("reopenHref") as string) || "/calendar/new";

  const staffId =
    staff.role === "clinician" ? staff.id : (formData.get("staffId") as string);

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      practice_id: staff.practiceId,
      client_id: clientId,
      staff_id: staffId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      type,
      location_type: locationType,
    })
    .select("id")
    .single();

  if (error || !appointment) {
    redirect(`${reopenHref}&error=${encodeURIComponent(friendlyErrorMessage(error, "Could not create appointment"))}`);
  }

  let videoClientUrl: string | null = null;

  if (locationType === "telehealth") {
    const { data: apiKey } = await supabase.rpc("get_my_practice_daily_api_key");
    const video = await createDailyRoomWithAccessLinks({
      apiKey,
      name: appointment.id,
      expiresAt: new Date(endsAt.getTime() + 24 * 60 * 60 * 1000),
    });
    if (video) {
      videoClientUrl = video.clientUrl;
      await supabase
        .from("appointments")
        .update({
          video_room_url: video.roomUrl,
          video_practitioner_url: video.practitionerUrl,
          video_client_url: video.clientUrl,
        })
        .eq("id", appointment.id);
    }
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
      videoClientUrl,
    });
  }

  redirect(returnTo);
}
