"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/utils/supabase/current-client";
import { SELF_BOOKABLE_TYPES, type SelfBookableType } from "@/utils/appointment-types";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { sendAppointmentConfirmationEmail } from "@/utils/appointment-email";
import { createDailyRoomWithAccessLinks } from "@/utils/daily/create-room";

export async function bookAppointment(formData: FormData) {
  const client = await getCurrentClient();
  const supabase = await createClient();

  const startsAt = formData.get("startsAt") as string;
  const date = formData.get("date") as string;
  const type = formData.get("type") as string;
  const backParams = `date=${date}&type=${type}`;

  if (!SELF_BOOKABLE_TYPES.includes(type as SelfBookableType)) {
    redirect(`/portal/book?${backParams}&error=${encodeURIComponent("Invalid session type")}`);
  }

  const { data, error } = await supabase.rpc("book_appointment_as_client", {
    p_starts_at: startsAt,
    p_type: type,
  });

  if (error) {
    redirect(`/portal/book?${backParams}&error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  // Self-booked appointments are always telehealth.
  const { data: apiKey } = await supabase.rpc("get_my_practice_daily_api_key");
  const video = await createDailyRoomWithAccessLinks({
    apiKey,
    name: data.appointmentId,
    expiresAt: new Date(new Date(data.endsAt).getTime() + 24 * 60 * 60 * 1000),
  });
  if (video) {
    await supabase.rpc("attach_video_room_to_my_appointment", {
      p_appointment_id: data.appointmentId,
      p_room_url: video.roomUrl,
      p_practitioner_url: video.practitionerUrl,
      p_client_url: video.clientUrl,
    });
  }

  await sendAppointmentConfirmationEmail({
    clientEmail: data.clientEmail,
    clientName: data.clientName,
    staffName: data.staffName,
    practiceName: data.practiceName ?? client.practiceName,
    startsAt: data.startsAt,
    type: data.type,
    locationType: "telehealth",
    videoClientUrl: video?.clientUrl ?? null,
  });

  redirect(`/portal/book?${backParams}&booked=1`);
}
