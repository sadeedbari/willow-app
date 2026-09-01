import { sendEmail } from "@/utils/resend/send";

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual therapy",
  couples: "Couples therapy",
  family: "Family therapy",
  intake: "Intake session",
  group: "Group therapy",
};

export type AppointmentEmailDetails = {
  clientEmail: string | null;
  clientName: string;
  staffName: string | null;
  practiceName: string;
  startsAt: string;
  type: string;
  locationType: string;
};

// Best-effort -- sendEmail() itself never throws, and a missing client email
// (portal-less clients, or self-booking before an email is on file) is a
// normal, silent no-op rather than an error.
export async function sendAppointmentConfirmationEmail(details: AppointmentEmailDetails) {
  if (!details.clientEmail) return;

  const start = new Date(details.startsAt);
  const when = start.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const typeLabel = TYPE_LABEL[details.type] ?? details.type;
  const locationLabel = details.locationType === "telehealth" ? "Telehealth" : "In-office";

  await sendEmail({
    to: details.clientEmail,
    subject: `Appointment confirmed: ${when}`,
    html: `
      <p>Hi ${details.clientName},</p>
      <p>Your appointment with ${details.practiceName} is confirmed:</p>
      <ul>
        <li><strong>When:</strong> ${when}</li>
        <li><strong>Type:</strong> ${typeLabel}</li>
        <li><strong>Location:</strong> ${locationLabel}</li>
        ${details.staffName ? `<li><strong>With:</strong> ${details.staffName}</li>` : ""}
      </ul>
      <p>If you need to reschedule or cancel, please contact your practice directly.</p>
    `,
  });
}
