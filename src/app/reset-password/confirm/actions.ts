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

  // A recovery-token verification only ever grants aal1, but Supabase
  // requires aal2 to actually update a password once MFA is enabled --
  // client portal accounts never have MFA, so this only ever applies to
  // staff. Route through the same challenge normal login uses rather than
  // hitting that rejection only once the user has already filled the form.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2" && aal?.nextLevel === "aal2") {
    redirect(`/mfa/verify?next=${encodeURIComponent(destination)}`);
  }

  redirect(destination);
}
