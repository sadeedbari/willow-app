"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { clientIp, rateLimit } from "@/utils/rate-limit";

export async function confirmMfaRecovery(formData: FormData) {
  const token = formData.get("token") as string;

  if (!(await rateLimit("mfa-recover-ip", await clientIp(), 10, 900))) {
    redirect(`/mfa/recover/${token}?error=${encodeURIComponent("Too many attempts — please try again in a few minutes.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_mfa_recovery", { p_token: token }).maybeSingle();

  if (error || !data) {
    redirect(`/mfa/recover/${token}?error=${encodeURIComponent("This link has expired or was already used.")}`);
  }

  const { user_id: userId } = data as { staff_id: string; user_id: string; full_name: string };

  // Uses the service-role admin API rather than the user's own session --
  // by definition, whoever is stuck here can't reach aal2 to unenroll their
  // own factor (Supabase requires aal2 to unenroll a *verified* factor).
  const admin = createServiceRoleClient();
  const { data: factorsData } = await admin.auth.admin.mfa.listFactors({ userId });
  for (const factor of factorsData?.factors ?? []) {
    await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
  }

  redirect(
    `/login?notice=${encodeURIComponent("Two-factor authentication was reset. Log in and you'll be walked through setting it up again.")}`
  );
}
