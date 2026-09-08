"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { edgeFunctionErrorMessage } from "@/utils/friendly-error";

export async function inviteStaff(formData: FormData) {
  const supabase = await createClient();
  const headerList = await headers();
  const origin = headerList.get("origin") ?? "http://localhost:3000";

  const { data, error } = await supabase.functions.invoke("invite-staff", {
    body: {
      email: formData.get("email") as string,
      fullName: formData.get("fullName") as string,
      role: formData.get("role") as string,
      redirectTo: `${origin}/accept-invite`,
    },
  });

  if (error || data?.error) {
    const message = data?.error ?? (await edgeFunctionErrorMessage(error, "Could not send invite"));
    redirect(`/settings/staff/invite?error=${encodeURIComponent(message)}`);
  }

  redirect("/settings/staff");
}
