"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { stripe } from "@/utils/stripe/server";
import { redirect } from "next/navigation";

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

  redirect(session.url!);
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

  const session = await stripe.billingPortal.sessions.create({
    customer: practice.stripe_customer_id,
    return_url: `${SITE_URL}/settings/billing`,
  });

  redirect(session.url);
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

  await stripe.subscriptions.update(practice.stripe_subscription_id, { cancel_at_period_end: true });
  await supabase.from("practices").update({ cancel_at_period_end: true }).eq("id", staff.practiceId);

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

  await stripe.subscriptions.update(practice.stripe_subscription_id, { cancel_at_period_end: false });
  await supabase.from("practices").update({ cancel_at_period_end: false }).eq("id", staff.practiceId);

  redirect("/settings/billing");
}
