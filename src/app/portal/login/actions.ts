"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function portalLogin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/portal/login?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  const { data: clientId } = await supabase.rpc("my_client_id");
  redirect(clientId ? "/portal" : "/portal/login?error=No+client+account+found+for+this+login");
}
