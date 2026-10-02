"use server";

import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import {
  sendBookingRequestReceivedEmail,
  sendBookingRequestStaffEmail,
} from "@/utils/booking-request-email";
import { sendPushToStaff } from "@/utils/push/send";
import { clientIp, rateLimitAll } from "@/utils/rate-limit";

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

  // The checkbox's `required` only guards the browser; consent to the
  // stated purpose has to be enforced here too.
  if (formData.get("privacyAck") !== "on") {
    redirect(
      `/book/${slug}?${backParams}&error=${encodeURIComponent("Please confirm you've read how your information will be used.")}`,
    );
  }

  // Each submission emails the requester and the practitioner, so this is
  // also an email-bombing vector, not just spam.
  const allowed = await rateLimitAll([
    { bucket: "booking-ip", identifier: await clientIp(), limit: 5, windowSeconds: 3600 },
    { bucket: "booking-email", identifier: email ?? "", limit: 3, windowSeconds: 86400 },
    { bucket: "booking-slug", identifier: slug ?? "", limit: 40, windowSeconds: 3600 },
  ]);
  if (!allowed) {
    redirect(
      `/book/${slug}?${backParams}&error=${encodeURIComponent("Too many requests — please try again later or contact the practice directly.")}`,
    );
  }

  const supabase = createServiceRoleClient();
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
    practiceLogoUrl: data.logoUrl,
    startsAt: data.startsAt,
  });

  if (data.notifyStaff && data.staffEmail) {
    await sendBookingRequestStaffEmail({
      staffEmail: data.staffEmail,
      requesterName: fullName,
      startsAt: data.startsAt,
    });
  }

  await sendPushToStaff(data.staffId, {
    title: "New booking request",
    body: `${fullName} requested an intake session`,
    url: "/booking-requests",
  });

  redirect(`/book/${slug}?submitted=1`);
}
