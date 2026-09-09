"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { stripe } from "@/utils/stripe/server";

export async function removeSavedCard(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;

  if (staff.role !== "practice_admin" && staff.role !== "billing_admin") {
    redirect(`/clients/${clientId}?tab=billing`);
  }

  const supabase = await createClient();

  const [{ data: client }, { data: practice }] = await Promise.all([
    supabase.from("clients").select("stripe_customer_id").eq("id", clientId).single(),
    supabase.from("practices").select("stripe_connect_account_id").eq("id", staff.practiceId).single(),
  ]);

  // Best-effort on the Stripe side -- if the card or customer was already
  // removed directly in Stripe, that's not a reason to fail here; the local
  // cache still needs clearing either way.
  if (client?.stripe_customer_id && practice?.stripe_connect_account_id) {
    try {
      const paymentMethods = await stripe.paymentMethods.list(
        { customer: client.stripe_customer_id, type: "card" },
        { stripeAccount: practice.stripe_connect_account_id }
      );
      for (const pm of paymentMethods.data) {
        await stripe.paymentMethods.detach(pm.id, {}, { stripeAccount: practice.stripe_connect_account_id });
      }
    } catch {
      // Ignore -- clearing our own cache below is what actually matters.
    }
  }

  await supabase.rpc("remove_client_saved_card", { p_client_id: clientId });

  redirect(`/clients/${clientId}?tab=billing`);
}
