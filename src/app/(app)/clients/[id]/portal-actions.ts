"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { edgeFunctionErrorMessage, friendlyErrorMessage } from "@/utils/friendly-error";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function inviteToPortal(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect(`/clients/${clientId}`);
  }

  const supabase = await createClient();
  const headerList = await headers();
  const origin = headerList.get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.functions.invoke("invite-client", {
    body: {
      clientId,
      redirectTo: `${origin}/portal/accept-invite`,
    },
  });

  if (error || data?.error) {
    const message = data?.error ?? (await edgeFunctionErrorMessage(error, "Could not send invite"));
    redirect(`/clients/${clientId}?error=${encodeURIComponent(message)}`);
  }

  redirect(`/clients/${clientId}?invited=1`);
}

// For a client who already has portal access (portal_user_id set) but lost
// the original invite email, never got it, or is an old client coming back
// after a while -- inviteUserByEmail (used above) errors on an existing
// account, so this reuses the password-recovery flow instead: it sends a
// real, working link regardless of whether they ever finished the original
// invite, and works the same way self-service "forgot password" does.
export async function resendPortalInvite(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "front_desk") {
    redirect(`/clients/${clientId}`);
  }

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("email, portal_user_id")
    .eq("id", clientId)
    .single();

  if (!client?.portal_user_id) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent("This client doesn't have portal access yet")}`);
  }
  if (!client.email) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent("This client has no email on file")}`);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(client.email, {
    redirectTo: `${SITE_URL}/reset-password`,
  });

  if (error) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent(friendlyErrorMessage(error, "Could not resend invite"))}`);
  }

  redirect(`/clients/${clientId}?invited=1`);
}
