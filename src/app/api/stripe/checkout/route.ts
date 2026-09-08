import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { stripe } from "@/utils/stripe/server";
import { NextResponse } from "next/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// A plain route handler (not a server action) so the billing page's form can
// use a real `target="_blank"` -- server actions submit via JS and ignore
// that attribute, but a genuine form POST to a URL respects it.
export async function POST() {
  const staff = await getCurrentStaff();
  if (staff.role !== "practice_admin") {
    return NextResponse.redirect(
      `${SITE_URL}/settings/billing?error=${encodeURIComponent("Only practice admins can manage billing")}`
    );
  }

  const supabase = await createClient();
  const { data: practice } = await supabase
    .from("practices")
    .select("id, name, stripe_customer_id, primary_contact_email")
    .eq("id", staff.practiceId)
    .single();

  if (!practice) {
    return NextResponse.redirect(`${SITE_URL}/settings/billing?error=${encodeURIComponent("Practice not found")}`);
  }

  try {
    let customerId = practice.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: practice.name,
        email: practice.primary_contact_email ?? undefined,
        metadata: { practice_id: practice.id },
      });
      customerId = customer.id;
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
      // tax code on the product, which we haven't set up.
      managed_payments: { enabled: false },
    });

    return NextResponse.redirect(session.url!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start checkout";
    return NextResponse.redirect(`${SITE_URL}/settings/billing?error=${encodeURIComponent(message)}`);
  }
}
