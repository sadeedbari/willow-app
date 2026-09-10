"use server";

import { createClient } from "@/utils/supabase/server";
import { sendEmail } from "@/utils/resend/send";
import { redirect } from "next/navigation";

export async function verifyMfaChallenge(formData: FormData) {
  const factorId = formData.get("factorId") as string;
  const code = formData.get("code") as string;

  const supabase = await createClient();

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) {
    redirect(`/mfa/verify?error=${encodeURIComponent("Something went wrong starting verification — please try again.")}`);
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    redirect(`/mfa/verify?error=${encodeURIComponent("That code didn't match — check your authenticator app and try again.")}`);
  }

  redirect("/dashboard");
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function sendMfaRecoveryEmail() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("request_mfa_recovery").maybeSingle();

  if (error || !data) {
    redirect(
      `/mfa/verify?error=${encodeURIComponent(
        "No verified recovery email is on file for this account — ask your practice admin to reset your two-factor setup, or contact support."
      )}`
    );
  }

  const { token, recovery_email, full_name } = data as { token: string; recovery_email: string; full_name: string };
  const recoverUrl = `${SITE_URL}/mfa/recover/${token}`;

  await sendEmail({
    to: recovery_email,
    subject: "Reset two-factor authentication for your Willow account",
    html: `
      <p>Hi ${full_name},</p>
      <p>We received a request to reset two-factor authentication on your Willow staff account, using this recovery email address.</p>
      <p><a href="${recoverUrl}">Click here to reset your two-factor authentication</a>. This link expires in 30 minutes and can only be used once.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  redirect("/mfa/verify?recoverySent=1");
}
