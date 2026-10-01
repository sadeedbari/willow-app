import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export type CurrentStaff = {
  id: string;
  fullName: string;
  role: "practice_admin" | "clinician" | "front_desk" | "billing_admin";
  practiceId: string;
  practiceName: string;
  practiceLogoUrl: string | null;
  allowCustomInvoiceNumber: boolean;
};

async function getCurrentStaffInternal(opts: { enforceTrial: boolean }): Promise<CurrentStaff> {
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
      subscription_status: string | null;
      trial_ends_at: string | null;
      mfa_skip_login_at: string | null;
      practice_logo_url: string | null;
      allow_custom_invoice_number: boolean;
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
  // (nobody has enrolled one). Checked before billing so identity is settled
  // first regardless of subscription state.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel !== "aal2") {
    if (aal.nextLevel === "aal2") {
      // A verified factor already exists -- this per-login challenge is
      // never skippable, unlike initial setup below.
      redirect("/mfa/verify");
    }

    // Initial setup (no factor enrolled yet) can be skipped once per login
    // via the "Skip for now" button -- but only for the same login that
    // clicked it. A fresh sign-in advances last_sign_in_at past the skip
    // timestamp, so the prompt reappears next time rather than being
    // silenced forever.
    const skippedThisLogin =
      !!data.mfa_skip_login_at &&
      !!user.last_sign_in_at &&
      new Date(data.mfa_skip_login_at) >= new Date(user.last_sign_in_at);

    if (!skippedThisLogin) {
      redirect("/mfa/setup");
    }
  }

  // A trial that's run out with no paid subscription blocks every page
  // except /trial-expired itself (which reads staff/practice info directly
  // rather than through this function, to avoid redirecting to itself) and
  // the checkout action it links to (enforceTrial: false -- otherwise
  // clicking "Subscribe" from that very page would redirect right back to
  // itself before ever reaching Stripe).
  if (opts.enforceTrial) {
    const trialExpired =
      data.subscription_status === "trialing" && !!data.trial_ends_at && new Date(data.trial_ends_at) < new Date();
    if (trialExpired) {
      redirect("/trial-expired");
    }
  }

  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    practiceId: data.practice_id,
    practiceName: data.practice_name ?? "Your practice",
    practiceLogoUrl: data.practice_logo_url,
    allowCustomInvoiceNumber: data.allow_custom_invoice_number,
  };
}

export async function getCurrentStaff(): Promise<CurrentStaff> {
  return getCurrentStaffInternal({ enforceTrial: true });
}

// For the handful of entry points that must keep working even once a trial
// has expired -- today, just the checkout action linked from /trial-expired.
export async function getCurrentStaffAllowExpiredTrial(): Promise<CurrentStaff> {
  return getCurrentStaffInternal({ enforceTrial: false });
}
