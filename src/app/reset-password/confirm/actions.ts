"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

// Recovery is shared between staff (/reset-password) and client portal
// (/portal/reset-password) logins -- Supabase's email template is the same
// either way, so it carries the caller's original redirectTo as a full URL
// via {{ .RedirectTo }}. Resolve it to one of these two known paths rather
// than trusting it outright, so a tampered param can't send anyone off-site.
const ALLOWED_PATHS = ["/reset-password", "/portal/reset-password"];

function resolveDestination(raw: string | null) {
  if (!raw) return "/reset-password";
  try {
    const pathname = new URL(raw).pathname;
    return ALLOWED_PATHS.includes(pathname) ? pathname : "/reset-password";
  } catch {
    return ALLOWED_PATHS.includes(raw) ? raw : "/reset-password";
  }
}

export async function confirmPasswordReset(formData: FormData) {
  const tokenHash = formData.get("tokenHash") as string;
  const destination = resolveDestination(formData.get("destination") as string);

  if (!tokenHash) {
    redirect("/reset-password/confirm?error=1");
  }

  const supabase = await createClient();
  // Deliberately only reached by an explicit click on the confirm page below
  // -- never on the initial page load -- so an email-security scanner that
  // prefetches the link in transit can't burn the single-use token before
  // the real user gets to it. See confirm/page.tsx for the full rationale.
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });

  if (error) {
    redirect("/reset-password/confirm?error=1");
  }

  redirect(destination);
}
