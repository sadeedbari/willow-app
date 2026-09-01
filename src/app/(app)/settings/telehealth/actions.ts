"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

function requireAdmin(role: string) {
  if (role !== "practice_admin") {
    redirect("/settings/telehealth");
  }
}

export async function saveDailyApiKey(formData: FormData) {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  const apiKey = (formData.get("apiKey") as string)?.trim();
  if (!apiKey) {
    redirect("/settings/telehealth?error=Please+enter+an+API+key");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("practice_video_settings")
    .upsert({ practice_id: staff.practiceId, daily_api_key: apiKey, updated_at: new Date().toISOString() });

  if (error) {
    redirect(`/settings/telehealth?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  revalidatePath("/settings/telehealth");
  redirect("/settings/telehealth?saved=1");
}

export async function removeDailyApiKey() {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  const supabase = await createClient();
  await supabase.from("practice_video_settings").delete().eq("practice_id", staff.practiceId);

  revalidatePath("/settings/telehealth");
  redirect("/settings/telehealth");
}
