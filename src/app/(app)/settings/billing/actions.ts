"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { stripe } from "@/utils/stripe/server";
import { redirect } from "next/navigation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
