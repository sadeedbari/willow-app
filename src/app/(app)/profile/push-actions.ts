"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

// Called from the browser right after pushManager.subscribe() succeeds.
// Upserted on `endpoint` (unique) rather than inserted -- re-enabling on a
// device that already has a (possibly stale) row for the same endpoint
// should replace it, not conflict.
export async function savePushSubscription(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: boolean }> {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      staff_id: staff.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: null,
    },
    { onConflict: "endpoint" },
  );

  return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("staff_id", staff.id)
    .eq("endpoint", endpoint);

  return { ok: !error };
}
