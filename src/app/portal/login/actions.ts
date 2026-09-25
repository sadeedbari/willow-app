"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function portalLogin(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = formData.get("next") as string | null;
  // Only ever redirect somewhere inside the portal -- formData is
  // client-controlled, so an arbitrary or external `next` is ignored.
  const destination = next && next.startsWith("/portal") ? next : "/portal";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/portal/login?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  const { data: clientId } = await supabase.rpc("my_client_id");
  redirect(clientId ? destination : "/portal/login?error=No+client+account+found+for+this+login");
}
