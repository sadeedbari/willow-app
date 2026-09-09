"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import {
  sendBookingRequestReceivedEmail,
  sendBookingRequestStaffEmail,
} from "@/utils/booking-request-email";

export async function requestBooking(formData: FormData) {
  const slug = formData.get("slug") as string;
  const startsAt = formData.get("startsAt") as string;
  const date = formData.get("date") as string;
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const message = formData.get("message") as string;
  const backParams = `date=${date}&start=${encodeURIComponent(startsAt)}`;

  // Honeypot: a real visitor never sees or fills this field. Pretend success
  // rather than telling a bot what tripped it.
  if (formData.get("company")) {
    redirect(`/book/${slug}?submitted=1`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_public_booking_request", {
    p_slug: slug,
    p_starts_at: startsAt,
    p_full_name: fullName,
    p_email: email,
    p_phone: phone,
    p_message: message,
  });

  if (error || !data) {
    redirect(`/book/${slug}?${backParams}&error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  await sendBookingRequestReceivedEmail({
    toEmail: email,
    toName: fullName,
    staffName: data.staffName,
    practiceName: data.practiceName,
    startsAt: data.startsAt,
  });

  if (data.notifyStaff && data.staffEmail) {
    await sendBookingRequestStaffEmail({
      staffEmail: data.staffEmail,
      requesterName: fullName,
      startsAt: data.startsAt,
    });
  }

  redirect(`/book/${slug}?submitted=1`);
}
