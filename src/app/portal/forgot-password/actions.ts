"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { clientIp, rateLimitAll } from "@/utils/rate-limit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function requestPortalPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  // Over the limit, skip the send but show the same confirmation page, so a
  // caller can't tell whether an address is registered or whether it was blocked.
  const allowed = await rateLimitAll([
    { bucket: "portal-reset-ip", identifier: await clientIp(), limit: 5, windowSeconds: 900 },
    { bucket: "portal-reset-email", identifier: email ?? "", limit: 3, windowSeconds: 3600 },
  ]);

  if (allowed) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/portal/reset-password`,
    });
  }

  redirect("/portal/forgot-password/check-email");
}
