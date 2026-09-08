"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function requestPortalPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/reset-password`,
  });

  redirect("/portal/forgot-password/check-email");
}
