import { sendEmail } from "@/utils/resend/send";

// Where Sulo Systems (not a practice) hears about product-level events --
// distinct from RESEND_FROM_EMAIL, which is who these emails are sent *as*.
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL ?? "sulosystems@gmail.com";

// Fire-and-forget, sent the moment a practice is actually created (not at
// signup -- a signup only creates the auth user, and plenty of those never
// finish onboarding). Never blocks or fails the signup flow itself: sendEmail
// swallows its own errors.
export async function sendNewPracticeSignupEmail(details: {
  practiceName: string;
  ownerFullName: string;
  ownerEmail: string;
}) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Willow signup: ${details.practiceName}`,
    html: `
      <p>A new practice just signed up.</p>
      <ul>
        <li><strong>Practice:</strong> ${details.practiceName}</li>
        <li><strong>Owner:</strong> ${details.ownerFullName}</li>
        <li><strong>Email:</strong> ${details.ownerEmail}</li>
      </ul>
      <p>They're on the standard 14-day free trial.</p>
    `,
  });
}
