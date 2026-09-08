"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    redirect(`/reset-password?error=${encodeURIComponent("Passwords don't match")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  // Recovery works the same for a staff login or a client portal login --
  // land them wherever their account actually is.
  const { data: practiceId } = await supabase.rpc("my_practice_id");
  if (practiceId) {
    redirect("/dashboard");
  }

  const { data: clientId } = await supabase.rpc("my_client_id");
  redirect(clientId ? "/portal" : "/login");
}
