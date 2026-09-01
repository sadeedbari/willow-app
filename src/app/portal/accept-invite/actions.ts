"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function acceptPortalInvite(formData: FormData) {
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/portal/accept-invite?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect("/portal");
}
