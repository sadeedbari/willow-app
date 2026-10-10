import { sendEmail } from "@/utils/resend/send";
import { DISPLAY_TIME_ZONE } from "@/utils/timezone";

// See appointment-email.ts's logoHtml -- same reasoning, duplicated rather
// than shared across the two small util files to avoid a cross-import for
// one line of markup.
function logoHtml(logoUrl?: string | null): string {
  return logoUrl ? `<p><img src="${logoUrl}" alt="" style="max-height:48px;max-width:200px" /></p>` : "";
}

function formatWhen(startsAt: string) {
  return new Date(startsAt).toLocaleString("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Sent to the prospective client the moment they submit a public booking
// request -- this is not a confirmation (nothing is on the calendar yet),
// just an acknowledgement that a real person will review it.
export async function sendBookingRequestReceivedEmail(details: {
  toEmail: string;
  toName: string;
  staffName: string | null;
  practiceName: string;
  practiceLogoUrl?: string | null;
  startsAt: string;
}) {
  await sendEmail({
    to: details.toEmail,
    fromName: details.practiceName,
    subject: `Request received: ${details.practiceName}`,
    html: `
      ${logoHtml(details.practiceLogoUrl)}
      <p>Hi ${details.toName},</p>
      <p>Thanks for reaching out to ${details.practiceName}. Your request for an intake session${
        details.staffName ? ` with ${details.staffName}` : ""
      } on <strong>${formatWhen(details.startsAt)}</strong> has been received.</p>
      <p>This isn't confirmed yet -- someone from the practice will review your request and follow up by email shortly.</p>
    `,
  });
}

// Best-effort staff notification, gated by staff.notify_on_booking_request --
// mirrors the notify_on_message pattern in src/utils/messaging.ts.
export async function sendBookingRequestStaffEmail(details: {
  staffEmail: string;
  requesterName: string;
  startsAt: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await sendEmail({
    to: details.staffEmail,
    subject: `New booking request from ${details.requesterName}`,
    html: `
      <p>${details.requesterName} requested an intake session for <strong>${formatWhen(details.startsAt)}</strong> through your public booking link.</p>
      <p><a href="${siteUrl}/booking-requests">Review the request</a> to approve or decline it.</p>
    `,
  });
}

// Best-effort, sent when staff decline a request.
export async function sendBookingRequestDeclinedEmail(details: {
  toEmail: string;
  toName: string;
  practiceName: string;
  practiceLogoUrl?: string | null;
  reason: string | null;
}) {
  await sendEmail({
    to: details.toEmail,
    fromName: details.practiceName,
    subject: `Update on your request to ${details.practiceName}`,
    html: `
      ${logoHtml(details.practiceLogoUrl)}
      <p>Hi ${details.toName},</p>
      <p>Thanks for your interest in ${details.practiceName}. Unfortunately they're not able to take your requested appointment${
        details.reason ? `: ${details.reason}` : "."
      }</p>
      <p>Please feel free to reach out to the practice directly if you'd like to find another time.</p>
    `,
  });
}
