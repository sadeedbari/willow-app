"use server";

import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { redirect } from "next/navigation";
import { stripe, isMissingConnectAccountError } from "@/utils/stripe/server";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { formatInvoiceLabel } from "@/utils/invoice-label";
import { clientIp, rateLimit } from "@/utils/rate-limit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type InvoiceByToken = {
  id: string;
  invoice_number: number;
  invoice_label: string | null;
  status: string;
  total_cents: number;
  amount_paid_cents: number;
  client_full_name: string;
  practice_name: string;
  practice_logo_url: string | null;
  stripe_connect_account_id: string | null;
  stripe_connect_charges_enabled: boolean;
  client_stripe_customer_id: string | null;
};

export async function startInvoicePayment(formData: FormData) {
  const token = formData.get("token") as string;

  if (!(await rateLimit("pay-start-ip", await clientIp(), 20, 600))) {
    redirect(`/pay/${token}?error=${encodeURIComponent("Too many attempts — please try again in a few minutes.")}`);
  }

  const supabase = createServiceRoleClient();

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

  const invoiceLabel = formatInvoiceLabel(invoice.invoice_number, invoice.invoice_label);

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
        // Reuse the client's existing Stripe Customer if they already have
        // one (from a previous payment) rather than creating a duplicate;
        // otherwise let Stripe create one only if the client actually opts
        // in to its own "save my payment info" checkbox below.
        ...(invoice.client_stripe_customer_id
          ? { customer: invoice.client_stripe_customer_id }
          : { customer_creation: "if_required" as const }),
        payment_intent_data: {
          // Attaches the card to the Customer for reuse if the client checks
          // Stripe's built-in save-payment-info box -- their choice, not
          // forced. See the stripe-webhook Edge Function's
          // checkout.session.completed handler for where that gets picked
          // up and cached onto clients.stripe_customer_id/card_*.
          setup_future_usage: "off_session",
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
    // A practice's connect account can go stale after the "pay online"
    // button was already showing (e.g. a test-mode account orphaned by a
    // platform-wide live-mode migration) -- never surface Stripe's internal
    // account-plumbing language to the paying client.
    errorMessage = isMissingConnectAccountError(err)
      ? "Online payment isn't set up for this practice right now — please contact them directly to pay this invoice."
      : friendlyErrorMessage(err as { code?: string; message?: string }, "Could not start payment");
  }

  // redirect() must never be called inside a try/catch -- Next.js implements
  // it by throwing, and a surrounding catch here would swallow that throw
  // and treat the redirect itself as a failure.
  if (errorMessage) {
    redirect(`/pay/${token}?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(checkoutUrl!);
}
