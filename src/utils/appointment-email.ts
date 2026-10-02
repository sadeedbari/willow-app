import { sendEmail } from "@/utils/resend/send";
import { DISPLAY_TIME_ZONE } from "@/utils/timezone";

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual therapy",
  couples: "Couples therapy",
  family: "Family therapy",
  intake: "Intake session",
  group: "Group therapy",
};

function formatWhen(startsAt: string): string {
  return new Date(startsAt).toLocaleString("en-US", {
    timeZone: DISPLAY_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type AppointmentEmailDetails = {
  clientEmail: string | null;
  clientName: string;
  staffName: string | null;
  practiceName: string;
  practiceLogoUrl?: string | null;
  startsAt: string;
  type: string;
  locationType: string;
  videoClientUrl?: string | null;
};

// Prepended to every client-facing email so a practice's own logo is what
// clients see, not just the Willow brand -- see willow-app memory on
// per-practice branding. Absent for practices with no logo on file.
function logoHtml(logoUrl?: string | null): string {
  return logoUrl ? `<p><img src="${logoUrl}" alt="" style="max-height:48px;max-width:200px" /></p>` : "";
}

function appointmentDetailsHtml(details: AppointmentEmailDetails, when: string): string {
  const typeLabel = TYPE_LABEL[details.type] ?? details.type;
  const locationLabel = details.locationType === "telehealth" ? "Telehealth" : "In-office";

  return `
    <ul>
      <li><strong>When:</strong> ${when}</li>
      <li><strong>Type:</strong> ${typeLabel}</li>
      <li><strong>Location:</strong> ${locationLabel}</li>
      ${details.staffName ? `<li><strong>With:</strong> ${details.staffName}</li>` : ""}
    </ul>
    ${
      details.videoClientUrl
        ? `<p><a href="${details.videoClientUrl}">Join the video call</a> at your appointment time. You'll wait in a virtual lobby until your clinician starts the session.</p>`
        : ""
    }
  `;
}

// Best-effort -- sendEmail() itself never throws, and a missing client email
// (portal-less clients, or self-booking before an email is on file) is a
// normal, silent no-op rather than an error.
export async function sendAppointmentConfirmationEmail(details: AppointmentEmailDetails) {
  if (!details.clientEmail) return;

  const when = formatWhen(details.startsAt);

  await sendEmail({
    to: details.clientEmail,
    subject: `Appointment confirmed: ${when}`,
    html: `
      ${logoHtml(details.practiceLogoUrl)}
      <p>Hi ${details.clientName},</p>
      <p>Your appointment with ${details.practiceName} is confirmed:</p>
      ${appointmentDetailsHtml(details, when)}
      <p>If you need to reschedule or cancel, please contact your practice directly.</p>
    `,
  });
}

// Best-effort, sent whenever a scheduled appointment's time changes --
// either side can trigger this (the practitioner from the calendar, or the
// client rescheduling themselves from the portal).
export async function sendAppointmentRescheduledEmail(details: AppointmentEmailDetails) {
  if (!details.clientEmail) return;

  const when = formatWhen(details.startsAt);

  await sendEmail({
    to: details.clientEmail,
    subject: `Appointment rescheduled: ${when}`,
    html: `
      ${logoHtml(details.practiceLogoUrl)}
      <p>Hi ${details.clientName},</p>
      <p>Your appointment with ${details.practiceName} has been rescheduled to a new time:</p>
      ${appointmentDetailsHtml(details, when)}
      <p>If this doesn't work for you, please contact your practice directly.</p>
    `,
  });
}

// Best-effort, sent whenever a scheduled appointment is cancelled -- either
// side can trigger this (the practitioner from the calendar, or the client
// cancelling themselves from the portal).
export async function sendAppointmentCancelledEmail(details: AppointmentEmailDetails) {
  if (!details.clientEmail) return;

  const when = formatWhen(details.startsAt);

  await sendEmail({
    to: details.clientEmail,
    subject: `Appointment cancelled: ${when}`,
    html: `
      ${logoHtml(details.practiceLogoUrl)}
      <p>Hi ${details.clientName},</p>
      <p>Your appointment with ${details.practiceName} that was scheduled for <strong>${when}</strong> has been cancelled.</p>
      <p>If this wasn't expected, or you'd like to book a new time, please contact your practice directly.</p>
    `,
  });
}

// Sent once, ~24 hours ahead of the appointment, by the
// send-appointment-reminders cron route -- gated on both the practice's and
// the client's own appointment_reminders_enabled toggle before this is ever
// called, so there's no separate opt-out check needed here.
export async function sendAppointmentReminderEmail(details: AppointmentEmailDetails) {
  if (!details.clientEmail) return;

  const when = formatWhen(details.startsAt);

  await sendEmail({
    to: details.clientEmail,
    subject: `Reminder: upcoming appointment ${when}`,
    html: `
      ${logoHtml(details.practiceLogoUrl)}
      <p>Hi ${details.clientName},</p>
      <p>This is a reminder about your upcoming appointment with ${details.practiceName}:</p>
      ${appointmentDetailsHtml(details, when)}
      <p>If you need to reschedule or cancel, please contact your practice directly. You can turn these reminder emails off anytime from the Notifications tab in your client portal.</p>
    `,
  });
}
