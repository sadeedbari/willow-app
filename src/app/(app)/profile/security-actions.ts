"use server";

import { createClient } from "@/utils/supabase/server";
import { sendEmail } from "@/utils/resend/send";
import { redirect } from "next/navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function requestRecoveryEmailChange(formData: FormData) {
  const email = formData.get("recoveryEmail") as string;
  const supabase = await createClient();

  const { data: token, error } = await supabase.rpc("request_recovery_email_change", { p_email: email });

  if (error || !token) {
    redirect(`/profile/security?error=${encodeURIComponent(error?.message ?? "Enter a valid email address")}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await sendEmail({
    to: email,
    subject: "Confirm your Willow recovery email",
    html: `
      <p>You (or someone using this Willow staff account: ${user?.email ?? ""}) asked to set this address as a recovery email.</p>
      <p>It's used only if that account ever gets locked out of two-factor authentication.</p>
      <p><a href="${SITE_URL}/verify-recovery-email/${token}">Click here to confirm this recovery email</a>. This link expires in 30 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  redirect("/profile/security?recoveryEmailSent=1");
}
