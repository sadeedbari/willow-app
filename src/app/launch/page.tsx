import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// The manifest's start_url -- what opens when someone taps the home-screen
// icon added via "Add to Home Screen". A session cookie almost always
// already exists by then (that's the whole point of installing it), so this
// just resolves it to the right landing page instead of showing the public
// marketing homepage every time. Mirrors the same staff/client checks
// already used in /login and the portal login action.
export default async function LaunchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staffRow } = await supabase.rpc("get_my_staff_row").maybeSingle();
  if (staffRow) redirect("/dashboard");

  const { data: clientId } = await supabase.rpc("my_client_id");
  if (clientId) redirect("/portal");

  redirect("/onboarding");
}
