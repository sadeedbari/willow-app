// Deployed via the Supabase MCP `deploy_edge_function` tool with verify_jwt:
// false -- Stripe calls this endpoint directly and does not send a Supabase
// JWT. Authenticity is instead verified via the Stripe-Signature header.
//
// This one URL receives events from TWO separate Stripe webhook_endpoint
// registrations, each with its own signing secret: a "your account" one
// (subscription events, connect:false) and a "connected accounts" one
// (connect:true -- required for events on a connected account, e.g. a
// client paying an invoice via a direct charge on the practice's own
// Stripe account; these do NOT show up on the platform's own event/webhook
// stream at all, confirmed via the Connect webhooks docs and by checking
// /v1/events directly -- a "your account" webhook alone silently never
// fires for them). We don't know in advance which secret signed a given
// request, so we just try both.
//
// Requires three custom secrets set manually in the Supabase Dashboard
// (Edge Functions -> stripe-webhook -> Secrets), since no MCP tool exists
// to set them:
//   STRIPE_SECRET_KEY             -- same test-mode secret key used by the Next.js app
//   STRIPE_WEBHOOK_SECRET         -- signing secret from the "your account" webhook endpoint
//   STRIPE_CONNECT_WEBHOOK_SECRET -- signing secret from the "connected accounts" (connect:true) endpoint
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const adminClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// The Next.js app, not this Deno function, sends the "paid" receipt email --
// PDF rendering (@react-pdf/renderer) needs a Node runtime this edge function
// doesn't have. This is the deployment's own *.vercel.app address on
// purpose, not the custom domain: that address never changes when the
// custom domain does, and a domain redirect would drop the Authorization
// header from this call. Override with an APP_URL secret if ever needed.
const APP_URL = Deno.env.get("APP_URL") ?? "https://willow-app-9l8u.vercel.app";

const RELEVANT_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
];

// Shared by checkout.session.completed and payment_intent.succeeded --
// exactly the same "already paid is a no-op" idempotent update, just
// reached via two different Stripe flows (a one-off Checkout session vs a
// saved-card off-session charge). `updated` tells the caller whether this
// call was the one that actually transitioned the invoice to paid, so the
// receipt email fires exactly once even if Stripe retries the event.
async function markInvoicePaid(invoiceId: string): Promise<{ updated: boolean; error?: string }> {
  const { data: invoice } = await adminClient
    .from("invoices")
    .select("id, status, total_cents")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice || invoice.status === "paid") {
    return { updated: false };
  }

  const { error } = await adminClient
    .from("invoices")
    .update({
      status: "paid",
      amount_paid_cents: invoice.total_cents,
      payment_method: "card",
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  return error ? { updated: false, error: error.message } : { updated: true };
}

// Best-effort, like sendEmail() elsewhere -- a failed receipt email must
// never turn a successful payment into a 500 back to Stripe (which would
// just make Stripe retry the whole event, including the charge-side effects
// that already happened).
async function sendPaidReceiptEmail(invoiceId: string) {
  try {
    await fetch(`${APP_URL}/api/internal/invoice-paid-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoiceId }),
    });
  } catch (err) {
    console.error("Failed to trigger paid-receipt email:", err);
  }
}

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  if (!signature) {
    return new Response("Missing Stripe-Signature header", { status: 400 });
  }

  const candidateSecrets = [
    Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET"),
  ].filter((s): s is string => !!s);

  let event: Stripe.Event | undefined;
  let lastError: unknown;
  for (const secret of candidateSecrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, secret, undefined, cryptoProvider);
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!event) {
    const message = lastError instanceof Error ? lastError.message : String(lastError);
    console.error("Webhook signature verification failed against all known secrets:", message);
    return new Response(`Invalid signature: ${message}`, { status: 400 });
  }

  if (!RELEVANT_EVENTS.includes(event.type)) {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // checkout.session.completed fires for BOTH a client paying an invoice
  // (a direct charge on a connected account, event.account set) and could
  // in principle fire for the platform's own subscription checkout -- but
  // subscription checkout redirects straight to Stripe's hosted page and
  // we already track subscription state via the customer.subscription.*
  // events below, so here we only act on it when it carries our own
  // invoice_id metadata (set when the /pay/[token] page creates the
  // session).
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoice_id;

    if (!invoiceId) {
      return new Response(JSON.stringify({ received: true, skipped: "no invoice_id in metadata" }), { status: 200 });
    }

    const { data: invoiceRow } = await adminClient
      .from("invoices")
      .select("client_id")
      .eq("id", invoiceId)
      .maybeSingle();

    const { updated, error } = await markInvoicePaid(invoiceId);
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }
    if (updated) {
      await sendPaidReceiptEmail(invoiceId);
    }

    // If the client opted in to Stripe's "save my payment info" checkbox
    // (see payment_intent_data.setup_future_usage in src/app/pay/[token]/
    // actions.ts), a Customer now exists on this connected account with a
    // saved card attached -- cache it on the client for display, and for
    // future off-session charges from the invoice page.
    if (session.customer && invoiceRow?.client_id && event.account) {
      const customerId = session.customer as string;

      await adminClient
        .from("clients")
        .update({ stripe_customer_id: customerId })
        .eq("id", invoiceRow.client_id)
        .is("stripe_customer_id", null);

      const paymentMethods = await stripe.paymentMethods.list(
        { customer: customerId, type: "card" },
        { stripeAccount: event.account }
      );
      const card = paymentMethods.data[0]?.card;
      if (card) {
        await adminClient
          .from("clients")
          .update({ stripe_card_brand: card.brand, stripe_card_last4: card.last4 })
          .eq("id", invoiceRow.client_id);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // A saved-card charge from the invoice page (chargeSavedCard) creates and
  // confirms a PaymentIntent directly -- there's no Checkout Session in that
  // flow to carry checkout.session.completed, so this is what actually
  // marks the invoice paid for that path. Kept as a separate confirmation
  // step (rather than trusting the synchronous API response in the Next.js
  // action) for the same reason regular checkout payments already work this
  // way: the webhook is the one source of truth for "paid".
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = paymentIntent.metadata?.invoice_id;

    if (!invoiceId) {
      return new Response(JSON.stringify({ received: true, skipped: "no invoice_id in metadata" }), { status: 200 });
    }

    const { updated, error } = await markInvoicePaid(invoiceId);
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500 });
    }
    if (updated) {
      await sendPaidReceiptEmail(invoiceId);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // Defense-in-depth: chargeSavedCard's own try/catch already shows staff an
  // immediate error for the overwhelmingly common synchronous-decline case.
  // This covers the rarer case where the charge fails asynchronously after
  // that request already returned, so it doesn't just look "stuck".
  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const invoiceId = paymentIntent.metadata?.invoice_id;

    if (!invoiceId) {
      return new Response(JSON.stringify({ received: true, skipped: "no invoice_id in metadata" }), { status: 200 });
    }

    const { data: invoice } = await adminClient
      .from("invoices")
      .select("id, invoice_number, practice_id, issued_by_staff_id")
      .eq("id", invoiceId)
      .maybeSingle();

    if (!invoice) {
      return new Response(JSON.stringify({ received: true, skipped: "invoice not found" }), { status: 200 });
    }

    const reason = paymentIntent.last_payment_error?.message ?? "The card was declined";
    const invoiceLabel = `INV-${String(invoice.invoice_number).padStart(4, "0")}`;

    await adminClient.from("notifications").insert({
      practice_id: invoice.practice_id,
      staff_id: invoice.issued_by_staff_id,
      type: "payment_failed",
      title: "Saved-card charge failed",
      body: `${invoiceLabel}: ${reason}`,
      link: `/invoices/${invoiceId}`,
    });

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const practiceId = subscription.metadata?.practice_id;

  if (!practiceId) {
    return new Response(JSON.stringify({ received: true, skipped: "no practice_id in metadata" }), { status: 200 });
  }

  const status = event.type === "customer.subscription.deleted" ? "canceled" : subscription.status;
  const currentPeriodEnd = subscription.items?.data[0]?.current_period_end;

  // Which of Willow's two plans (solo/team) this subscription is on -- read
  // straight off the subscribed Price's own metadata (set when the price was
  // created in Stripe), rather than a separate env var or lookup, so this
  // stays correct across a portal-initiated plan switch with zero extra code.
  // The Price object comes embedded on the subscription item already, no
  // expand needed.
  const plan = subscription.items?.data[0]?.price?.metadata?.plan ?? null;

  const { error } = await adminClient
    .from("practices")
    .update({
      subscription_status: status,
      subscription_plan: plan,
      stripe_subscription_id: subscription.id,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    })
    .eq("id", practiceId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // A discount promo code used at checkout (startCheckout puts promo_code_id
  // on the subscription's metadata). The redemption is recorded only now, once
  // the subscription is really live, so an abandoned checkout never uses up a
  // code. record_checkout_promo is idempotent per (code, practice), so Stripe
  // retries and the created+updated event pair can't double-count. Best-effort:
  // a failure here must never turn a good subscription event into a 500.
  const promoCodeId = subscription.metadata?.promo_code_id;
  if (promoCodeId && (status === "active" || status === "trialing")) {
    const { error: promoError } = await adminClient.rpc("record_checkout_promo", {
      p_practice_id: practiceId,
      p_promo_code_id: promoCodeId,
    });
    if (promoError) {
      console.error("Failed to record checkout promo:", promoError.message);
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
