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

const RELEVANT_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.completed",
];

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

    const { data: invoice } = await adminClient
      .from("invoices")
      .select("id, status, total_cents")
      .eq("id", invoiceId)
      .maybeSingle();

    // Idempotency: Stripe retries on non-2xx, and a customer could in theory
    // land back on the success page and the webhook could both fire --
    // already-paid is a no-op, not an error.
    if (!invoice || invoice.status === "paid") {
      return new Response(JSON.stringify({ received: true, skipped: "invoice missing or already paid" }), { status: 200 });
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

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const practiceId = subscription.metadata?.practice_id;

  if (!practiceId) {
    return new Response(JSON.stringify({ received: true, skipped: "no practice_id in metadata" }), { status: 200 });
  }

  const status = event.type === "customer.subscription.deleted" ? "canceled" : subscription.status;
  const currentPeriodEnd = subscription.items?.data[0]?.current_period_end;

  const { error } = await adminClient
    .from("practices")
    .update({
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    })
    .eq("id", practiceId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
