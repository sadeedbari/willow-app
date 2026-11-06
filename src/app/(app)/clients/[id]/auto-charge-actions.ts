"use server";

import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { createAndSendConsentForm } from "@/utils/consent-form";
import { STARTER_TEMPLATES } from "@/app/(app)/forms/starter-templates";

const CARD_TEMPLATE_SLUG = "card_on_file";

function back(clientId: string, query = "") {
  return `/clients/${clientId}?tab=billing${query}`;
}

// Emails the client the "Card on File Authorization" form. Signing it (see the
// sign_consent_form_by_token database function) is the ONLY thing that turns
// automatic payment on for a client -- this action just sends the form.
export async function sendCardAuthorization(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "billing_admin") {
    redirect(back(clientId));
  }

  // Confirms the client belongs to this practice, under the caller's own RLS.
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id").eq("id", clientId).single();
  if (!client) redirect("/clients");

  const starter = STARTER_TEMPLATES.find((t) => t.slug === CARD_TEMPLATE_SLUG)!;
  const admin = createServiceRoleClient();

  // Make sure this practice has the template (a billing admin can't write
  // templates themselves). ignoreDuplicates keeps any edits the practice made.
  await admin
    .from("consent_form_templates")
    .upsert(
      { slug: starter.slug, title: starter.title, body: starter.body, practice_id: staff.practiceId },
      { onConflict: "practice_id,slug", ignoreDuplicates: true },
    );

  const { data: template } = await admin
    .from("consent_form_templates")
    .select("id")
    .eq("practice_id", staff.practiceId)
    .eq("slug", CARD_TEMPLATE_SLUG)
    .single();
  if (!template) redirect(back(clientId, `&error=${encodeURIComponent("Could not prepare the authorization form.")}`));

  const result = await createAndSendConsentForm(admin as unknown as Awaited<ReturnType<typeof createClient>>, {
    practiceId: staff.practiceId,
    practiceName: staff.practiceName,
    practiceLogoUrl: staff.practiceLogoUrl,
    clientId,
    templateId: template.id,
  });

  if (!result.ok) {
    redirect(back(clientId, `&error=${encodeURIComponent(result.error)}`));
  }

  // The existing "form created, here's the signing link" banner picks this up.
  revalidatePath(`/clients/${clientId}`);
  redirect(back(clientId, `&consentToken=${result.accessToken}`));
}

// Turns automatic payment off. Re-enabling needs a fresh signed authorization.
export async function revokeAutoCharge(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "billing_admin") {
    redirect(back(clientId));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_client_auto_charge", { p_client_id: clientId });
  if (error) redirect(back(clientId, `&error=${encodeURIComponent("Could not turn off automatic payment.")}`));

  revalidatePath(`/clients/${clientId}`);
  redirect(back(clientId));
}
