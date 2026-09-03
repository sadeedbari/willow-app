import { createClient } from "@/utils/supabase/server";
import { sendEmail } from "@/utils/resend/send";

type CreateConsentFormResult =
  | { ok: true; accessToken: string; emailed: boolean }
  | { ok: false; error: string };

// Shared by the client-profile "Send a form" flow and the Forms page's
// "+ Send Form" flow so both create the exact same kind of record and, when
// the client has an email on file, actually email them a signing link
// (rather than only ever showing staff a copyable link).
export async function createAndSendConsentForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { practiceId: string; practiceName: string; clientId: string; templateId: string }
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
      body_snapshot: template.body,
      status: "pending",
    })
    .select("access_token")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create form" };
  }

  let emailed = false;
  if (client?.email) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const signingUrl = `${siteUrl}/consent/${data.access_token}`;
    emailed = await sendEmail({
      to: client.email,
      subject: `${template.title} — please review and sign`,
      html: `
        <p>Hi ${client.full_name},</p>
        <p>${params.practiceName} has sent you a form to review and sign: <strong>${template.title}</strong>.</p>
        <p><a href="${signingUrl}">Click here to review and sign</a>.</p>
      `,
    });
  }

  return { ok: true, accessToken: data.access_token, emailed };
}
