"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { stripe } from "@/utils/stripe/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function startCheckout() {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    redirect("/settings/billing?error=Only+practice+admins+can+manage+billing");
  }

  const supabase = await createClient();
  const { data: practice } = await supabase
    .from("practices")
    .select("id, name, stripe_customer_id, primary_contact_email")
    .eq("id", staff.practiceId)
    .single();

  if (!practice) {
    redirect("/settings/billing?error=Practice+not+found");
  }

  let checkoutUrl: string | null = null;
  let errorMessage: string | null = null;
  try {
    let customerId = practice.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: practice.name,
        email: practice.primary_contact_email ?? undefined,
        metadata: { practice_id: practice.id },
      });
      customerId = customer.id;

      // Written via the caller's own RLS-respecting session -- the existing
      // "practice_admin updates own practice" policy already covers this,
      // no service-role client needed here.
      await supabase.from("practices").update({ stripe_customer_id: customerId }).eq("id", practice.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      subscription_data: { metadata: { practice_id: practice.id } },
      success_url: `${SITE_URL}/settings/billing?checkout=success`,
      cancel_url: `${SITE_URL}/settings/billing?checkout=cancelled`,
      // Managed Payments (on by default on newer Stripe accounts) requires a
      // tax code on the product, which we haven't set up -- disable it rather
      // than block checkout on that.
      managed_payments: { enabled: false },
    });
    checkoutUrl = session.url;
  } catch (err) {
    errorMessage = friendlyErrorMessage(err as { code?: string; message?: string }, "Could not start checkout");
  }

  // redirect() must never be called inside a try/catch -- Next.js implements
  // it by throwing, and a surrounding catch here would swallow that throw
  // and treat the redirect itself as a failure.
  if (errorMessage) {
    redirect(`/settings/billing?error=${encodeURIComponent(errorMessage)}`);
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
    });
    portalUrl = session.url;
  } catch (err) {
    errorMessage = friendlyErrorMessage(err as { code?: string; message?: string }, "Could not open the billing portal");
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
