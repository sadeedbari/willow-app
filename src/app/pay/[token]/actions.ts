"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { stripe } from "@/utils/stripe/server";
import { friendlyErrorMessage } from "@/utils/friendly-error";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type InvoiceByToken = {
  id: string;
  invoice_number: number;
  status: string;
  total_cents: number;
  amount_paid_cents: number;
  client_full_name: string;
  practice_name: string;
  practice_logo_url: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_charges_enabled: boolean;
};

export async function startInvoicePayment(formData: FormData) {
  const token = formData.get("token") as string;
  const supabase = await createClient();

  const { data: invoice } = (await supabase
    .rpc("get_invoice_by_payment_token", { p_token: token })
    .maybeSingle()) as { data: InvoiceByToken | null };

  if (!invoice) {
    redirect(`/pay/${token}?error=${encodeURIComponent("Invoice not found")}`);
  }
  if (invoice.status === "paid" || invoice.status === "void") {
    redirect(`/pay/${token}`);
  }
  if (!invoice.stripe_connect_account_id || !invoice.stripe_connect_charges_enabled) {
    redirect(
      `/pay/${token}?error=${encodeURIComponent("Online payment isn't set up for this practice yet — please contact them directly.")}`
    );
  }

  const balanceCents = invoice.total_cents - invoice.amount_paid_cents;
  if (balanceCents <= 0) {
    redirect(`/pay/${token}`);
  }

  const invoiceLabel = `INV-${String(invoice.invoice_number).padStart(4, "0")}`;

  let checkoutUrl: string | null = null;
  let errorMessage: string | null = null;
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "cad",
              unit_amount: balanceCents,
              product_data: { name: `${invoiceLabel} — ${invoice.practice_name}` },
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata: { invoice_id: invoice.id, payment_token: token },
        },
        metadata: { invoice_id: invoice.id, payment_token: token },
        success_url: `${SITE_URL}/pay/${token}?paid=1`,
        cancel_url: `${SITE_URL}/pay/${token}?cancelled=1`,
      },
      { stripeAccount: invoice.stripe_connect_account_id }
    );
    checkoutUrl = session.url;
    await supabase.rpc("set_invoice_checkout_session", { p_token: token, p_session_id: session.id });
  } catch (err) {
    errorMessage = friendlyErrorMessage(err as { code?: string; message?: string }, "Could not start payment");
  }

  // redirect() must never be called inside a try/catch -- Next.js implements
  // it by throwing, and a surrounding catch here would swallow that throw
  // and treat the redirect itself as a failure.
  if (errorMessage) {
    redirect(`/pay/${token}?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(checkoutUrl!);
}
