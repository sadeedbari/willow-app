"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { sendAppointmentConfirmationEmail } from "@/utils/appointment-email";
import { sendBookingRequestDeclinedEmail } from "@/utils/booking-request-email";
import { createDailyRoomWithAccessLinks } from "@/utils/daily/create-room";
import { getDailyApiKey } from "@/utils/daily/api-key";

export async function approveBookingRequest(requestId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  // Runs as a SECURITY DEFINER RPC, not a plain insert -- a clinician
  // approving their own request can't insert into `clients` directly (that's
  // restricted to practice_admin/front_desk), so the claim + find-or-create
  // client + create appointment all happen atomically inside the function.
  const { data: result, error } = await supabase.rpc("approve_booking_request", { p_request_id: requestId });

  if (error || !result) {
    redirect(`/booking-requests?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  let videoClientUrl: string | null = null;
  const video = await createDailyRoomWithAccessLinks({
    apiKey: await getDailyApiKey(staff.practiceId),
    name: result.appointmentId,
    endsAt: new Date(result.endsAt),
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
      .eq("id", result.appointmentId);
  }

  const { data: clinician } = await supabase.from("staff").select("full_name").eq("id", result.staffId).single();

  await sendAppointmentConfirmationEmail({
    clientEmail: result.email,
    clientName: result.fullName,
    staffName: clinician?.full_name ?? null,
    practiceName: staff.practiceName,
    practiceLogoUrl: staff.practiceLogoUrl,
    startsAt: result.startsAt,
    type: "intake",
    locationType: "telehealth",
    videoClientUrl,
  });

  redirect("/booking-requests?approved=1");
}

export async function declineBookingRequest(requestId: string, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const reason = (formData.get("reason") as string) || null;

  const { data: request } = await supabase
    .from("booking_requests")
    .select("full_name, email, practice_id")
    .eq("id", requestId)
    .single();

  const { data: declined } = await supabase
    .from("booking_requests")
    .update({
      status: "declined",
      decline_reason: reason,
      decided_by_staff_id: staff.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .single();

  if (declined && request) {
    await sendBookingRequestDeclinedEmail({
      toEmail: request.email,
      toName: request.full_name,
      practiceName: staff.practiceName,
      practiceLogoUrl: staff.practiceLogoUrl,
      reason,
    });
  }

  redirect("/booking-requests?declined=1");
}
