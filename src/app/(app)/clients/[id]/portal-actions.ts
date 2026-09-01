"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

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
      redirectTo: `${origin}/auth/callback?next=/portal/accept-invite`,
    },
  });

  if (error || data?.error) {
    redirect(`/clients/${clientId}?error=${encodeURIComponent(data?.error ?? friendlyErrorMessage(error, "Could not send invite"))}`);
  }

  redirect(`/clients/${clientId}`);
}
