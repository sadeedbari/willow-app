"use server";

import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

function requireAdmin(role: string) {
  if (role !== "practice_admin") {
    redirect("/settings/integrations");
  }
}

export async function saveDailyApiKey(formData: FormData) {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  const apiKey = (formData.get("apiKey") as string)?.trim();
  if (!apiKey) {
    redirect("/settings/integrations?error=Please+enter+an+API+key");
  }

  // The table is service-role only (a key must never be readable from a
  // browser session); the admin check above is what authorizes this write.
  const { error } = await createServiceRoleClient()
    .from("practice_video_settings")
    .upsert({ practice_id: staff.practiceId, daily_api_key: apiKey, updated_at: new Date().toISOString() });

  if (error) {
    redirect(`/settings/integrations?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  revalidatePath("/settings/integrations");
  redirect("/settings/integrations?saved=1");
}

export async function removeDailyApiKey() {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  await createServiceRoleClient().from("practice_video_settings").delete().eq("practice_id", staff.practiceId);

  revalidatePath("/settings/integrations");
  redirect("/settings/integrations");
}
