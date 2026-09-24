// Willow's two plans cap how many staff accounts a practice can have. This
// mirrors the same limits enforced server-side in the invite-staff edge
// function (supabase/functions/invite-staff/index.ts) -- that's the real
// gate, since it's the only path that can create a staff_invitations row.
// This copy is UI-only, so the staff page can show/hide the invite affordance
// without an extra round trip.
export const PLAN_STAFF_LIMITS: Record<string, number> = { solo: 1, team: 6 };

// `null` (still trialing, no plan chosen yet) gets the generous Team cap so a
// prospective practice can fully evaluate multi-staff features before ever
// having to decide between the two -- the real cap only bites once they've
// actually subscribed to Solo.
export const DEFAULT_STAFF_LIMIT = 6;

export const UPGRADE_CONTACT_EMAIL = "info@sulosystems.com";

export function getStaffLimit(subscriptionPlan: string | null): number {
  if (!subscriptionPlan) return DEFAULT_STAFF_LIMIT;
  return PLAN_STAFF_LIMITS[subscriptionPlan] ?? DEFAULT_STAFF_LIMIT;
}
