"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { clientIp, rateLimitAll } from "@/utils/rate-limit";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const allowed = await rateLimitAll([
    { bucket: "login-ip", identifier: await clientIp(), limit: 30, windowSeconds: 900 },
    { bucket: "login-email", identifier: email ?? "", limit: 10, windowSeconds: 900 },
  ]);
  if (!allowed) {
    redirect(`/login?error=${encodeURIComponent("Too many login attempts — please wait 15 minutes and try again.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  // Route based on account state, not just whether they're authenticated:
  // already on a practice -> dashboard; invited to join one -> accept it
  // (never let an invited user accidentally found a new practice instead);
  // otherwise -> onboarding to create their own.
  const { data: practiceId } = await supabase.rpc("my_practice_id");
  if (practiceId) {
    redirect("/dashboard");
  }

  const { data: invitation } = await supabase.rpc("get_my_pending_invitation").maybeSingle();
  redirect(invitation ? "/accept-invite" : "/onboarding");
}
