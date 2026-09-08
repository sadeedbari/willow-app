"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  const supabase = await createClient();
  // Never branch on the result -- Supabase already avoids confirming whether
  // an email is registered, and we don't want to add a leak on top of that.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/reset-password`,
  });

  redirect("/forgot-password/check-email");
}
