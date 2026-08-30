"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

export async function openNotification(formData: FormData) {
  await getCurrentStaff();
  const id = formData.get("id") as string;
  const link = (formData.get("link") as string) || "/notifications";

  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);

  redirect(link);
}

export async function markAllNotificationsRead() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("staff_id", staff.id)
    .is("read_at", null);

  redirect("/notifications");
}
