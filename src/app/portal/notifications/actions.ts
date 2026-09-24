"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/utils/supabase/current-client";

// Clients have no general UPDATE policy on their own row (only staff can
// update clients -- RLS can't scope an UPDATE to specific columns, only
// rows, so a broad self-update policy would let a client rewrite anything
// on their own record). update_my_appointment_reminder_pref() is the
// narrow, single-column exception for exactly this toggle.
export async function updateMyNotificationPrefs(formData: FormData) {
  await getCurrentClient();
  const supabase = await createClient();

  await supabase.rpc("update_my_appointment_reminder_pref", {
    p_enabled: formData.get("appointmentRemindersEnabled") === "on",
  });

  redirect("/portal/notifications?saved=1");
}
