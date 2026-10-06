"use server";

import { createClient } from "@/utils/supabase/server";
import { verifyCurrentPassword } from "@/utils/verify-password";
import { sendEmail } from "@/utils/resend/send";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function changeMyPassword(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!(await verifyCurrentPassword(currentPassword))) {
    redirect(`/profile/security?error=${encodeURIComponent("Current password is incorrect")}`);
  }

  if (password !== confirmPassword) {
    redirect(`/profile/security?error=${encodeURIComponent("Passwords don't match")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/profile/security?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect("/profile/security?passwordChanged=1");
}

// Removes every TOTP factor on the CALLER's OWN account. Unlike
// settings/staff/actions.ts's resetStaffMfa (an admin acting on someone
// else's account, which needs the service-role client to bypass the normal
// "you can only manage your own factors" boundary), this runs entirely
// through the caller's own session -- mfa.unenroll() only ever touches the
// calling user's own factors, so no elevated client is needed here.
export async function resetMyMfa(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  if (!(await verifyCurrentPassword(currentPassword))) {
    redirect(`/profile/security?error=${encodeURIComponent("Current password is incorrect")}`);
  }

  const supabase = await createClient();
  const { data: factorsData } = await supabase.auth.mfa.listFactors();

  for (const factor of factorsData?.totp ?? []) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  revalidatePath("/profile/security");
  redirect("/profile/security?mfaReset=1");
}

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
