// Server-only. RESEND_API_KEY has no NEXT_PUBLIC_ prefix, so it's never
// bundled to the client. Never throws -- callers that only fire-and-forget
// (e.g. appointment confirmations) can ignore the return value; callers
// triggered by an explicit user action (e.g. "Resend invoice") can check
// it to show real success/failure feedback instead of assuming it worked.
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? "Willow <no-reply@willowtherapy.ca>";
const DEFAULT_SENDER_NAME = "Willow";

// The bare address inside RESEND_FROM_EMAIL ("Name <addr>" or just "addr").
// The address always stays on Willow's verified sending domain -- only the
// display name ever varies.
const FROM_ADDRESS = /<([^>]+)>/.exec(DEFAULT_FROM)?.[1] ?? DEFAULT_FROM.replace(/^"|"$/g, "");

// Practice names are typed in by users and end up as the visible sender name
// in a client's inbox, so keep them from impersonating an address or breaking
// the header. Allowlist: letters (any language), digits, spaces and a few
// harmless punctuation marks. Everything else -- including @ < > " backslash,
// commas, semicolons, colons and control characters -- is dropped. Whitespace
// is collapsed and the result capped; falls back to "Willow" if nothing
// usable is left.
const DISALLOWED_NAME_CHARS = /[^\p{L}\p{M}\p{N} .&'()+/!?#%*_-]+/gu;

export function safeSenderName(name?: string | null): string {
  const cleaned = (name ?? "")
    .replace(DISALLOWED_NAME_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim();
  return cleaned || DEFAULT_SENDER_NAME;
}

function fromHeader(fromName?: string | null): string {
  // No name given -> the platform default exactly as configured.
  if (!fromName) return DEFAULT_FROM;
  return `"${safeSenderName(fromName)}" <${FROM_ADDRESS}>`;
}

// `fromName` is the visible sender name. Pass the practice's name for any
// email whose recipient is a CLIENT of that practice; omit it for emails to
// the practice itself (staff/admin/billing/security), which come from Willow.

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  replyTo,
  fromName,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
  replyTo?: string;
  fromName?: string | null;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set -- skipping email send");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromHeader(fromName),
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments?.length
          ? {
              attachments: attachments.map((a) => ({
                filename: a.filename,
                content: a.content.toString("base64"),
              })),
            }
          : {}),
      }),
    });

    if (!res.ok) {
      console.error("Resend send failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend send threw:", err);
    return false;
  }
}
