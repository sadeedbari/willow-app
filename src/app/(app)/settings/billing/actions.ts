"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff, getCurrentStaffAllowExpiredTrial } from "@/utils/supabase/current-staff";
import { stripe } from "@/utils/stripe/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Willow's two plans, each its own Stripe Product/Price (a portal-driven
// plan switch needs separate products -- Stripe's subscription_update
// "switch plan" feature requires every listed product to have a distinct
// billing interval, which two same-interval tiers under one product can't
// satisfy). Looked up by lookup_key at request time rather than a hardcoded
// price id env var, so a price can be rotated in Stripe with no redeploy.
const PLAN_LOOKUP_KEYS = { solo: "willow_solo_monthly", team: "willow_team_monthly" } as const;
type Plan = keyof typeof PLAN_LOOKUP_KEYS;

function isPlan(value: unknown): value is Plan {
  return value === "solo" || value === "team";
}

// A Willow-scoped Billing Portal configuration (created once via the Stripe
// API) enabling self-serve plan switching between the two prices above. Not
// the account-wide default -- this Stripe account also hosts other unrelated
// Sulo Systems products, so portal sessions for them must keep using their
// own default configuration untouched.
const BILLING_PORTAL_CONFIGURATION_ID = "bpc_1UJ2Uw8nJOCbrtNYDurVpN1W";

// True when Stripe rejects a customer id because it doesn't exist in the
// current account/mode -- e.g. a stripe_customer_id saved back when the app
// used test-mode keys, now invalid after a live-mode migration. Stripe's own
// shape for this is a resource_missing error with param "customer"; we also
// match on the message text since not every SDK error surfaces `param`.
function isMissingCustomerError(err: unknown): boolean {
  const e = err as { code?: string; param?: string; message?: string };
  return e?.code === "resource_missing" && (e.param === "customer" || (e.message ?? "").includes("No such customer"));
}

export async function startCheckout(formData: FormData) {
  // Uses the trial-tolerant variant -- this is the one action that must
  // keep working even after a trial has expired, since it's exactly how a
  // practice escapes that state. It's only ever linked to from either
  // /settings/billing (trial still active) or /trial-expired (not), so the
  // redirect target below is computed per-request rather than hardcoded.
  const staff = await getCurrentStaffAllowExpiredTrial();
  if (staff.role !== "practice_admin") {
    redirect("/settings/billing?error=Only+practice+admins+can+manage+billing");
  }

  const plan = formData.get("plan");
  if (!isPlan(plan)) {
    redirect("/settings/billing?error=Choose+a+plan+to+subscribe+to");
  }

  const supabase = await createClient();
  const { data: practice } = await supabase
    .from("practices")
    .select("id, name, stripe_customer_id, primary_contact_email, subscription_status, trial_ends_at")
    .eq("id", staff.practiceId)
    .single();

  if (!practice) {
    redirect("/settings/billing?error=Practice+not+found");
  }

  const trialExpired =
    practice.subscription_status === "trialing" &&
    !!practice.trial_ends_at &&
    new Date(practice.trial_ends_at) < new Date();
  const subscriptionCanceled = practice.subscription_status === "canceled";
  const returnPath = trialExpired || subscriptionCanceled ? "/trial-expired" : "/settings/billing";

  // Resolved before the try/catch below (which is scoped to the
  // customer/session creation flow and would otherwise swallow this
  // redirect() call's own throw as a generic Stripe error -- see the
  // redirect()-inside-try/catch note below).
  let priceId: string | undefined;
  try {
    const prices = await stripe.prices.list({ lookup_keys: [PLAN_LOOKUP_KEYS[plan]], active: true });
    priceId = prices.data[0]?.id;
  } catch {
    priceId = undefined;
  }
  if (!priceId) {
    redirect(`${returnPath}?error=${encodeURIComponent("That plan isn't available right now — please try again shortly.")}`);
  }
  // Reassigned to a const so it stays narrowed to `string` (not
  // `string | undefined`) once captured inside the createSession closure
  // below -- TS doesn't carry control-flow narrowing of a `let` into a
  // closure, since it could in principle be reassigned before the closure runs.
  const resolvedPriceId: string = priceId;

  let checkoutUrl: string | null = null;
  let errorMessage: string | null = null;
  try {
    const createCustomer = async () => {
      const customer = await stripe.customers.create({
        name: practice.name,
        email: practice.primary_contact_email ?? undefined,
        metadata: { practice_id: practice.id },
      });
      // Written via the caller's own RLS-respecting session -- the existing
      // "practice_admin updates own practice" policy already covers this,
      // no service-role client needed here.
      await supabase.from("practices").update({ stripe_customer_id: customer.id }).eq("id", practice.id);
      return customer.id;
    };

    let customerId = practice.stripe_customer_id ?? (await createCustomer());

    const createSession = () =>
      stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        subscription_data: { metadata: { practice_id: practice.id, plan } },
        success_url: `${SITE_URL}${returnPath}?checkout=success`,
        cancel_url: `${SITE_URL}${returnPath}?checkout=cancelled`,
        // Managed Payments (on by default on newer Stripe accounts) requires a
        // tax code on the product, which we haven't set up -- disable it rather
        // than block checkout on that.
        managed_payments: { enabled: false },
      });

    let session;
    try {
      session = await createSession();
    } catch (err) {
      // A stripe_customer_id saved under different Stripe keys (e.g. before
      // the live-mode migration) points to a customer that no longer exists
      // in the account we're calling now. Rather than surface that as a raw
      // "No such customer" error, create a fresh customer under the current
      // keys and retry once.
      if (!isMissingCustomerError(err)) throw err;
      customerId = await createCustomer();
      session = await createSession();
    }
    checkoutUrl = session.url;
  } catch (err) {
    errorMessage = friendlyErrorMessage(err as { code?: string; message?: string }, "Could not start checkout");
  }

  // redirect() must never be called inside a try/catch -- Next.js implements
  // it by throwing, and a surrounding catch here would swallow that throw
  // and treat the redirect itself as a failure.
  if (errorMessage) {
    redirect(`${returnPath}?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(checkoutUrl!);
}

export async function openBillingPortal() {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings/billing?error=Only+practice+admins+can+manage+billing");
  }

  const supabase = await createClient();
  const { data: practice } = await supabase
    .from("practices")
    .select("stripe_customer_id")
    .eq("id", staff.practiceId)
    .single();

  if (!practice?.stripe_customer_id) {
    redirect("/settings/billing?error=No+billing+account+yet");
  }

  let portalUrl: string | null = null;
  let errorMessage: string | null = null;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: practice.stripe_customer_id,
      return_url: `${SITE_URL}/settings/billing`,
      configuration: BILLING_PORTAL_CONFIGURATION_ID,
    });
    portalUrl = session.url;
  } catch (err) {
    if (isMissingCustomerError(err)) {
      // Same stale-customer situation as startCheckout, but there's no
      // active subscription to manage here either way -- clear the bad id
      // so the next "Subscribe" click creates a fresh customer automatically,
      // and point them there instead of at a portal for an account that no
      // longer exists.
      await supabase.from("practices").update({ stripe_customer_id: null }).eq("id", staff.practiceId);
      errorMessage = "Your billing account needs to be reconnected — click Subscribe to set it up again.";
    } else {
      errorMessage = friendlyErrorMessage(err as { code?: string; message?: string }, "Could not open the billing portal");
    }
  }

  if (errorMessage) {
    redirect(`/settings/billing?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(portalUrl!);
}

// Cancels at the end of the current paid period rather than immediately --
// the practice keeps access through what they've already paid for, matching
// the "Access ends <date>" copy the billing page already shows.
export async function cancelSubscription() {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings/billing?error=Only+practice+admins+can+manage+billing");
  }

  const supabase = await createClient();
  const { data: practice } = await supabase
    .from("practices")
    .select("stripe_subscription_id")
    .eq("id", staff.practiceId)
    .single();

  if (!practice?.stripe_subscription_id) {
    redirect("/settings/billing?error=No+active+subscription+to+cancel");
  }

  let errorMessage: string | null = null;
  try {
    await stripe.subscriptions.update(practice.stripe_subscription_id, { cancel_at_period_end: true });
    await supabase.from("practices").update({ cancel_at_period_end: true }).eq("id", staff.practiceId);
  } catch (err) {
    errorMessage = friendlyErrorMessage(err as { code?: string; message?: string }, "Could not cancel the subscription");
  }

  if (errorMessage) {
    redirect(`/settings/billing?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect("/settings/billing");
}

export async function resumeSubscription() {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings/billing?error=Only+practice+admins+can+manage+billing");
  }

  const supabase = await createClient();
  const { data: practice } = await supabase
    .from("practices")
    .select("stripe_subscription_id")
    .eq("id", staff.practiceId)
    .single();

  if (!practice?.stripe_subscription_id) {
    redirect("/settings/billing?error=No+subscription+found");
  }

  let errorMessage: string | null = null;
  try {
    await stripe.subscriptions.update(practice.stripe_subscription_id, { cancel_at_period_end: false });
    await supabase.from("practices").update({ cancel_at_period_end: false }).eq("id", staff.practiceId);
  } catch (err) {
    errorMessage = friendlyErrorMessage(err as { code?: string; message?: string }, "Could not resume the subscription");
  }

  if (errorMessage) {
    redirect(`/settings/billing?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect("/settings/billing");
}
