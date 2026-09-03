"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { stripe } from "@/utils/stripe/server";
import { friendlyErrorMessage } from "@/utils/friendly-error";

function stripeErrorMessage(err: unknown, fallback: string): string {
  return friendlyErrorMessage(err as { code?: string; message?: string }, fallback);
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function requireAdmin(role: string) {
  if (role !== "practice_admin") {
    redirect("/settings/integrations");
  }
}

// Creates the connected account on first use, then (every time) issues a
// fresh Account Link and redirects to it -- an Account Link is single-use
// and expires after a few minutes, so "Connect" and "Continue setup" are
// the same action: reuse the existing account id if there is one, else
// create it first.
export async function connectStripe() {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  const supabase = await createClient();
  const { data: practice } = await supabase
    .from("practices")
    .select("id, stripe_connect_account_id")
    .eq("id", staff.practiceId)
    .single();

  if (!practice) {
    redirect("/settings/integrations?error=Practice+not+found");
  }

  let accountId = practice.stripe_connect_account_id;
  let errorMessage: string | null = null;

  if (!accountId) {
    try {
      const account = await stripe.accounts.create({ type: "standard" });
      accountId = account.id;
      await supabase.from("practices").update({ stripe_connect_account_id: accountId }).eq("id", practice.id);
    } catch (err) {
      errorMessage = stripeErrorMessage(err, "Could not start Stripe connection");
    }
  }

  let accountLinkUrl: string | null = null;
  if (!errorMessage) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId!,
        refresh_url: `${SITE_URL}/settings/integrations`,
        return_url: `${SITE_URL}/settings/integrations`,
        type: "account_onboarding",
      });
      accountLinkUrl = accountLink.url;
    } catch (err) {
      errorMessage = stripeErrorMessage(err, "Could not open Stripe onboarding");
    }
  }

  // redirect() must never be called inside a try/catch -- Next.js implements
  // it by throwing, and a surrounding catch here would swallow that throw
  // and treat the redirect itself as a failure.
  if (errorMessage) {
    redirect(`/settings/integrations?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(accountLinkUrl!);
}

// Only forgets the connection on Willow's side -- doesn't delete or
// deactivate the practice's actual Stripe account. They can reconnect the
// same account later (a fresh "Connect" click reuses the id if reconnected
// with the same login), or connect a different one.
export async function disconnectStripe() {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  const supabase = await createClient();
  await supabase
    .from("practices")
    .update({ stripe_connect_account_id: null, stripe_connect_details_submitted: false, stripe_connect_charges_enabled: false })
    .eq("id", staff.practiceId);

  redirect("/settings/integrations");
}
