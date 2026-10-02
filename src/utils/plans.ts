// Willow's two subscription tiers, shared between the plan picker on
// /settings/billing and the resubscribe picker on /trial-expired so the two
// never drift apart. Each plan's own Stripe Price is looked up by this same
// `key` as a lookup_key at checkout time (see startCheckout).
export const PLANS = [
  {
    key: "solo",
    name: "Solo",
    price: "$15.90",
    tagline: "For a one-person practice",
    detail: "1 staff account",
  },
  {
    key: "team",
    name: "Team",
    price: "$49",
    tagline: "For a small group practice",
    detail: "Up to 6 staff accounts",
  },
] as const;
