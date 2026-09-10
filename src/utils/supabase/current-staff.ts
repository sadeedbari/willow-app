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

  // A plain `staff` table select is RLS-scoped through my_practice_id(),
  // which itself filters on active = true -- so once a staff member is
  // offboarded, that query returns nothing at all for their OWN row,
  // indistinguishable from "never onboarded". get_my_staff_row() is a
  // SECURITY DEFINER function that looks them up regardless of active, so
  // the two cases can be told apart.
  const { data } = (await supabase.rpc("get_my_staff_row").maybeSingle()) as {
    data: {
      id: string;
      full_name: string;
      role: CurrentStaff["role"];
      practice_id: string;
      active: boolean;
      practice_name: string;
    } | null;
  };

  if (!data) {
    redirect("/onboarding");
  }

  if (!data.active) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Your account has been deactivated. Contact your practice administrator.")}`);
  }

  // MFA is required for every staff account. getAuthenticatorAssuranceLevel()
  // reads straight off the current session's JWT (no network round trip) --
  // aal2 means this session already passed a TOTP challenge; nextLevel tells
  // us whether that's even possible yet (a verified factor exists) or not
  // (nobody has enrolled one).
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel !== "aal2") {
    redirect(aal.nextLevel === "aal2" ? "/mfa/verify" : "/mfa/setup");
  }

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    practiceId: data.practice_id,
    practiceName: data.practice_name ?? "Your practice",
  };
}
