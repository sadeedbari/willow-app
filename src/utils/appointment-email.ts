import { sendEmail } from "@/utils/resend/send";

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual therapy",
  couples: "Couples therapy",
  family: "Family therapy",
  intake: "Intake session",
  group: "Group therapy",
};

// Every practice today is Ontario-only (see willow-app scope memory) --
// hardcoded rather than a practices.timezone column, which would be
// meaningless until the product actually supports other regions. Without
// an explicit zone, toLocaleString() renders in whatever TZ the Node
// process happens to run in (UTC on Vercel), showing clients the wrong
// time entirely.
const DISPLAY_TIME_ZONE = "America/Toronto";

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
  startsAt: string;
  type: string;
  locationType: string;
  videoClientUrl?: string | null;
};

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
      <p>Hi ${details.clientName},</p>
      <p>Your appointment with ${details.practiceName} is confirmed:</p>
      ${appointmentDetailsHtml(details, when)}
      <p>If you need to reschedule or cancel, please contact your practice directly.</p>
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
      <p>Hi ${details.clientName},</p>
      <p>This is a reminder about your upcoming appointment with ${details.practiceName}:</p>
      ${appointmentDetailsHtml(details, when)}
      <p>If you need to reschedule or cancel, please contact your practice directly. You can turn these reminder emails off anytime from the Notifications tab in your client portal.</p>
    `,
  });
}
