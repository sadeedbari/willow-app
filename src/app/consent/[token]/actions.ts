"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { clientIp, rateLimit } from "@/utils/rate-limit";

export async function signConsentForm(formData: FormData) {
  const token = formData.get("token") as string;
  const signerName = (formData.get("signerName") as string)?.trim();

  if (!signerName) {
    redirect(`/consent/${token}?error=${encodeURIComponent("Please type your full name to sign.")}`);
  }

  if (!(await rateLimit("consent-sign-ip", await clientIp(), 20, 600))) {
    redirect(`/consent/${token}?error=${encodeURIComponent("Too many attempts — please try again in a few minutes.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("sign_consent_form_by_token", {
    p_token: token,
    p_signer_name: signerName,
  });

  if (error) {
    redirect(`/consent/${token}?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect(`/consent/${token}`);
}
