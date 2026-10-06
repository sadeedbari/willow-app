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

  const checkClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await checkClient.auth.signInWithPassword({ email: user.email, password: currentPassword });
  return !error;
}
