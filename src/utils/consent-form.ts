import { createClient } from "@/utils/supabase/server";
import { sendEmail } from "@/utils/resend/send";

function signingUrlFor(accessToken: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl}/consent/${accessToken}`;
}

// See appointment-email.ts's logoHtml -- same reasoning.
function logoHtml(logoUrl?: string | null): string {
  return logoUrl ? `<p><img src="${logoUrl}" alt="" style="max-height:48px;max-width:200px" /></p>` : "";
}

// Shared by every "send a client this form to sign" entry point (new send,
// resend) so the email is worded identically everywhere.
export async function sendConsentFormSigningEmail(params: {
  clientEmail: string;
  clientName: string;
  practiceName: string;
  practiceLogoUrl?: string | null;
  formTitle: string;
  accessToken: string;
}): Promise<boolean> {
  return sendEmail({
    to: params.clientEmail,
    fromName: params.practiceName,
    subject: `${params.formTitle} — please review and sign`,
    html: `
      ${logoHtml(params.practiceLogoUrl)}
      <p>Hi ${params.clientName},</p>
      <p>${params.practiceName} has sent you a form to review and sign: <strong>${params.formTitle}</strong>.</p>
      <p><a href="${signingUrlFor(params.accessToken)}">Click here to review and sign</a>.</p>
    `,
  });
}

type CreateConsentFormResult =
  | { ok: true; accessToken: string; emailed: boolean }
  | { ok: false; error: string };

// Shared by the client-profile "Send a form" flow and the Forms page's
// "+ Send Form" flow so both create the exact same kind of record and, when
// the client has an email on file, actually email them a signing link
// (rather than only ever showing staff a copyable link).
export async function createAndSendConsentForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { practiceId: string; practiceName: string; practiceLogoUrl?: string | null; clientId: string; templateId: string }
): Promise<CreateConsentFormResult> {
  const { data: template } = await supabase
    .from("consent_form_templates")
    .select("title, body")
    .eq("id", params.templateId)
    .single();

  if (!template) return { ok: false, error: "Template not found" };

  const { data: client } = await supabase
    .from("clients")
    .select("full_name, email")
    .eq("id", params.clientId)
    .single();

  const { data, error } = await supabase
    .from("consent_forms")
    .insert({
      practice_id: params.practiceId,
      client_id: params.clientId,
      form_type: template.title,
      template_id: params.templateId,
      // {{practice_name}} lets a template (e.g. the card-on-file authorization)
      // name the practice it is signed for; the snapshot is what the client sees.
      body_snapshot: template.body.replaceAll("{{practice_name}}", params.practiceName),
      status: "pending",
    })
    .select("access_token")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create form" };
  }

  let emailed = false;
  if (client?.email) {
    emailed = await sendConsentFormSigningEmail({
      clientEmail: client.email,
      clientName: client.full_name,
      practiceName: params.practiceName,
      practiceLogoUrl: params.practiceLogoUrl,
      formTitle: template.title,
      accessToken: data.access_token,
    });
  }

  return { ok: true, accessToken: data.access_token, emailed };
}
