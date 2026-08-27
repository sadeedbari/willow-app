import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export type CurrentStaff = {
  id: string;
  fullName: string;
  role: "practice_admin" | "clinician" | "front_desk" | "billing_admin";
  practiceId: string;
  practiceName: string;
};

// Fetches the signed-in user's staff row + practice name in one query.
// Redirects rather than returning null — every caller is a page inside
// the (app) route group, where a missing staff row means onboarding
// was never finished (proxy.ts already handles the "not logged in" case).
export async function getCurrentStaff(): Promise<CurrentStaff> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("staff")
    .select("id, full_name, role, practice_id, practices(name)")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    redirect("/onboarding");
  }

  const practice = data.practices as unknown as { name: string } | null;

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    practiceId: data.practice_id,
    practiceName: practice?.name ?? "Your practice",
  };
}
