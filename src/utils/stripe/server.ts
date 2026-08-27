import Stripe from "stripe";

// Server-only. STRIPE_SECRET_KEY has no NEXT_PUBLIC_ prefix, so it's never
// bundled to the client.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
