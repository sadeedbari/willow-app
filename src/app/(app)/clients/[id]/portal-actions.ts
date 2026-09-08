"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { edgeFunctionErrorMessage } from "@/utils/friendly-error";

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

  redirect(`/clients/${clientId}`);
}
