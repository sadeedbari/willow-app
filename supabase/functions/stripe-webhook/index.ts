// Deployed via the Supabase MCP `deploy_edge_function` tool with verify_jwt:
// false -- Stripe calls this endpoint directly and does not send a Supabase
// JWT. Authenticity is instead verified via the Stripe-Signature header
// against STRIPE_WEBHOOK_SECRET.
//
// Requires two custom secrets set manually in the Supabase Dashboard
// (Edge Functions -> stripe-webhook -> Secrets), since no MCP tool exists
// to set them:
//   STRIPE_SECRET_KEY     -- same test-mode secret key used by the Next.js app
//   STRIPE_WEBHOOK_SECRET -- signing secret from the Stripe Dashboard webhook
//                            endpoint, created after this function is deployed
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
];

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  if (!signature) {
    return new Response("Missing Stripe-Signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed:", message);
    return new Response(`Invalid signature: ${message}`, { status: 400 });
  }

  if (!RELEVANT_EVENTS.includes(event.type)) {
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
