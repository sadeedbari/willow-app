"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createAndSendConsentForm, sendConsentFormSigningEmail } from "@/utils/consent-form";

export async function sendFormToClient(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect("/forms");
  }

  const clientId = formData.get("clientId") as string;
  const templateId = formData.get("templateId") as string;
  const supabase = await createClient();

  const result = await createAndSendConsentForm(supabase, {
    practiceId: staff.practiceId,
    practiceName: staff.practiceName,
    clientId,
    templateId,
  });

  if (!result.ok) {
    redirect(`/forms?send=1&error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/forms?sent=${result.emailed ? "1" : "nomail"}`);
}

// Re-emails the same signing link for an existing pending consent form --
// deliberately does NOT create a new consent_forms row (that would leave
// two pending records for the same form), it just nudges the client again.
export async function resendPendingSignature(formData: FormData) {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect("/forms?tab=pending");
  }

  const consentFormId = formData.get("consentFormId") as string;
  const supabase = await createClient();

  const { data: form } = await supabase
    .from("consent_forms")
    .select("form_type, access_token, client_id, clients(full_name, email)")
    .eq("id", consentFormId)
    .eq("status", "pending")
    .single();

  const client = form?.clients as unknown as { full_name: string; email: string | null } | null;

  if (!form || !client?.email) {
    redirect(`/forms?tab=pending&error=${encodeURIComponent("This client has no email on file — share the link from their profile instead.")}`);
  }

  const emailed = await sendConsentFormSigningEmail({
    clientEmail: client.email,
    clientName: client.full_name,
    practiceName: staff.practiceName,
    formTitle: form.form_type,
    accessToken: form.access_token,
  });

  if (!emailed) {
    redirect(`/forms?tab=pending&error=${encodeURIComponent("Could not send the email — please try again.")}`);
  }

  redirect(`/forms?tab=pending&resent=1`);
}
