import Stripe from "stripe";

// Server-only. STRIPE_SECRET_KEY has no NEXT_PUBLIC_ prefix, so it's never
// bundled to the client.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// True when a Stripe Connect account id we have on file no longer resolves
// under our current secret key -- most commonly a test-mode account left
// over from before a platform-wide live-mode migration (test and live
// accounts are separate namespaces on Stripe's side, so a key rotation from
// test to live silently orphans every previously-connected account). Also
// covers an account genuinely deleted from the Stripe dashboard. Distinct
// Stripe error shapes for the two calls that can hit this:
// accounts.retrieve() -> StripePermissionError, code "account_invalid";
// accountLinks.create() -> StripeInvalidRequestError with no code, only
// this specific message.
export function isMissingConnectAccountError(err: unknown): boolean {
  const e = err as { code?: string; type?: string; message?: string } | null | undefined;
  if (!e) return false;
  if (e.code === "account_invalid") return true;
  return e.type === "StripeInvalidRequestError" && /not connected to your platform|does not exist/i.test(e.message ?? "");
}
