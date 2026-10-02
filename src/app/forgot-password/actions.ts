"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { clientIp, rateLimitAll } from "@/utils/rate-limit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  // Over the limit, skip the send but show the same confirmation page, so a
  // caller can't tell whether an address is registered or whether it was blocked.
  const allowed = await rateLimitAll([
    { bucket: "reset-ip", identifier: await clientIp(), limit: 5, windowSeconds: 900 },
    { bucket: "reset-email", identifier: email ?? "", limit: 3, windowSeconds: 3600 },
  ]);

  if (allowed) {
    const supabase = await createClient();
    // Never branch on the result -- Supabase already avoids confirming whether
    // an email is registered, and we don't want to add a leak on top of that.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
  }

  redirect("/forgot-password/check-email");
}
