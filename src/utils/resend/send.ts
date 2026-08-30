// Server-only. RESEND_API_KEY has no NEXT_PUBLIC_ prefix, so it's never
// bundled to the client. Notification emails are best-effort -- a failed
// send must never block the message/action that triggered it, so this
// never throws.
const FROM = "Willow <no-reply@therapybyniha.com>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set -- skipping email send");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    if (!res.ok) {
      console.error("Resend send failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Resend send threw:", err);
  }
}
