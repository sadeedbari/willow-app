import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Bypasses RLS entirely -- only for server-side code with no user session to
// authenticate against (e.g. webhooks). Never expose this client or the
// underlying key to a browser context.
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
