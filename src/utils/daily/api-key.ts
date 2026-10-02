import { createServiceRoleClient } from "@/utils/supabase/service-role";

// Server-only. A practice's own Daily.co key lives in practice_video_settings,
// which no browser-reachable role can read; a practice without its own key
// uses Willow's shared account from DAILY_API_KEY. Callers pass the practice
// id from their own authenticated session, never from user input.
export async function getDailyApiKey(practiceId: string): Promise<string | null> {
  const { data } = await createServiceRoleClient()
    .from("practice_video_settings")
    .select("daily_api_key")
    .eq("practice_id", practiceId)
    .maybeSingle();
  return data?.daily_api_key ?? process.env.DAILY_API_KEY ?? null;
}
