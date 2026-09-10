"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function verifyMfaSetup(formData: FormData) {
  const factorId = formData.get("factorId") as string;
  const code = formData.get("code") as string;

  const supabase = await createClient();

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) {
    redirect(`/mfa/setup?error=${encodeURIComponent("Something went wrong starting verification — please try again.")}`);
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    redirect(`/mfa/setup?error=${encodeURIComponent("That code didn't match — check your authenticator app and try again.")}`);
  }

  redirect("/dashboard");
}
