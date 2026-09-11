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

// Lets a brand-new staff account defer initial MFA setup for this one login
// rather than blocking their first look at the app. Deliberately does not
// use getCurrentStaff()/getCurrentStaffAllowExpiredTrial() -- at this point
// the session is still aal1 with no verified factor, so either would just
// redirect straight back to /mfa/setup before this could ever run.
export async function skipMfaSetup() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.rpc("get_my_staff_row").maybeSingle();
  if (!staffRow) redirect("/onboarding");

  await supabase
    .from("staff")
    .update({ mfa_skip_login_at: new Date().toISOString() })
    .eq("id", (staffRow as { id: string }).id);

  redirect("/dashboard");
}
