"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function acceptInvite(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    redirect(`/accept-invite?error=${encodeURIComponent(passwordError.message)}`);
  }

  const { error: acceptError } = await supabase.rpc("accept_staff_invitation");
  if (acceptError) {
    redirect(`/accept-invite?error=${encodeURIComponent(acceptError.message)}`);
  }

  redirect("/dashboard");
}
