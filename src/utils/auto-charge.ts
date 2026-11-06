// Charges a client's saved card for an invoice balance with no client present
// ("off-session"), on the practice's own Stripe Connect account. Used by the
// end-of-appointment job for clients who signed the card-on-file authorization.
//
// Deliberately free of app imports (only the Stripe *types*) and handed its
// Stripe client, so the exact charging rules can be tested with a fake Stripe
// and never touch a real card.

type RequestOptions = { stripeAccount?: string; idempotencyKey?: string };

export type StripeLike = {
  paymentMethods: {
    list(params: { customer: string; type: "card" }, options: RequestOptions): Promise<{ data: { id: string }[] }>;
  };
  paymentIntents: {
    create(
      params: {
        amount: number;
        currency: string;
        customer: string;
        payment_method: string;
        off_session: true;
        confirm: true;
        description?: string;
        metadata?: Record<string, string>;
      },
      options: RequestOptions,
    ): Promise<{ id: string; status: string }>;
  };
};

export type AutoChargeOutcome =
  | { kind: "charged"; paymentIntentId: string; status: string }
  | { kind: "no_card" }
  | { kind: "failed"; reason: string };

function describeStripeError(err: unknown): string {
  const e = err as { type?: string; code?: string; decline_code?: string; message?: string } | null;
  if (e?.type === "StripeCardError") {
    if (e.code === "authentication_required") {
      return "The card needs the client to verify it — send them a payment link instead.";
    }
    return e.message || "The card was declined.";
  }
  return "Could not charge the card.";
}

export async function chargeSavedCardOffSession(
  stripe: StripeLike,
  args: {
    stripeAccount: string;
    customerId: string;
    invoiceId: string;
    amountCents: number;
    description: string;
  },
): Promise<AutoChargeOutcome> {
  try {
    // Always look the card up live rather than trusting a cached id -- it may
    // have been replaced or removed directly in Stripe.
    const methods = await stripe.paymentMethods.list(
      { customer: args.customerId, type: "card" },
      { stripeAccount: args.stripeAccount },
    );
    const card = methods.data[0];
    if (!card) return { kind: "no_card" };

    const intent = await stripe.paymentIntents.create(
      {
        amount: args.amountCents,
        currency: "cad",
        customer: args.customerId,
        payment_method: card.id,
        off_session: true,
        confirm: true,
        description: args.description,
        metadata: { invoice_id: args.invoiceId, auto_charge: "true" },
      },
      // One charge per invoice, ever: even if this ran twice, Stripe returns
      // the first result instead of charging again.
      { stripeAccount: args.stripeAccount, idempotencyKey: `willow-auto-charge-${args.invoiceId}` },
    );

    // "processing" is a card payment that is still settling -- Stripe will tell
    // us (webhook) whether it succeeded; anything else is not a charge.
    if (intent.status === "succeeded" || intent.status === "processing") {
      return { kind: "charged", paymentIntentId: intent.id, status: intent.status };
    }
    return { kind: "failed", reason: "The card could not be charged automatically." };
  } catch (err) {
    return { kind: "failed", reason: describeStripeError(err) };
  }
}
