import { createServiceRoleClient } from "@/utils/supabase/service-role";

// One generic message for every way a code can fail (unknown, paused,
// expired, used up) so a caller probing codes learns nothing about which
// ones exist.
export const PROMO_INVALID_MESSAGE = "That promo code isn't valid, has expired, or has been fully redeemed.";

export const PROMO_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

export type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  kind: "trial_days" | "discount";
  trial_days: number | null;
  percent_off: number | null;
  discount_months: number | null;
  max_redemptions: number | null;
  redeemed_count: number;
  expires_at: string | null;
  active: boolean;
};

export function normalizePromoCode(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function isPromoUsable(promo: PromoCode, now: Date = new Date()): boolean {
  if (!promo.active) return false;
  if (promo.expires_at && new Date(promo.expires_at) <= now) return false;
  if (promo.max_redemptions !== null && promo.redeemed_count >= promo.max_redemptions) return false;
  return true;
}

// Looks a code up with the service-role client -- promo_codes is readable
// only by platform admins under RLS, so practices can't list or enumerate
// codes. Returns null for anything that isn't currently redeemable.
export async function findUsablePromo(raw: unknown): Promise<PromoCode | null> {
  const code = normalizePromoCode(raw);
  if (!PROMO_CODE_PATTERN.test(code)) return null;

  const { data } = await createServiceRoleClient()
    .from("promo_codes")
    .select(
      "id, code, description, kind, trial_days, percent_off, discount_months, max_redemptions, redeemed_count, expires_at, active",
    )
    .eq("code", code)
    .maybeSingle();

  if (!data) return null;
  const promo = data as PromoCode;
  return isPromoUsable(promo) ? promo : null;
}

export function trialLengthLabel(days: number): string {
  if (days % 30 === 0 && days >= 60) return `${days / 30}-month`;
  return `${days}-day`;
}

// Human-readable summary used on the admin screen.
export function describePromo(promo: Pick<PromoCode, "kind" | "trial_days" | "percent_off" | "discount_months">): string {
  if (promo.kind === "trial_days" && promo.trial_days) {
    return `${trialLengthLabel(promo.trial_days)} free trial`;
  }
  if (promo.percent_off === 100) {
    return `${promo.discount_months} month${promo.discount_months === 1 ? "" : "s"} free at checkout`;
  }
  return `${promo.percent_off}% off for ${promo.discount_months} month${promo.discount_months === 1 ? "" : "s"} at checkout`;
}
