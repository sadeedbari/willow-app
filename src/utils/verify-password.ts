import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Confirms the caller actually knows their CURRENT password before a
// sensitive change (changing the password itself, removing an
// authenticator, editing emergency-access details) -- guards against someone
// acting from an unlocked/unattended session. Uses a throwaway client
// (persistSession/autoRefreshToken off) so this credential check never
// touches the caller's real session cookies; the real action still runs on
// the normal cookie-bound client.
export async function verifyCurrentPassword(currentPassword: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !currentPassword) return false;

  // A successful signInWithPassword advances the user's last_sign_in_at, even
  // on a throwaway client. getCurrentStaff() treats a "Skip for now" MFA
  // choice as valid only while mfa_skip_login_at >= last_sign_in_at, so
  // without the re-stamp below, merely confirming a password would silently
  // cancel an MFA skip made earlier in this same login and bounce the user
  // to /mfa/setup (and from there, via Skip, to the dashboard).
  const { data: staffRow } = (await supabase.rpc("get_my_staff_row").maybeSingle()) as {
    data: { id: string; mfa_skip_login_at: string | null } | null;
  };
  const skipWasActive =
    !!staffRow?.mfa_skip_login_at &&
    !!user.last_sign_in_at &&
    new Date(staffRow.mfa_skip_login_at) >= new Date(user.last_sign_in_at);

  const checkClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await checkClient.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (error) return false;

  if (skipWasActive && staffRow) {
    await supabase.from("staff").update({ mfa_skip_login_at: new Date().toISOString() }).eq("id", staffRow.id);
  }
  return true;
}
