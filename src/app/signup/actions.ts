"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { clientIp, rateLimit, rateLimitAll } from "@/utils/rate-limit";
import { findUsablePromo, normalizePromoCode, PROMO_INVALID_MESSAGE } from "@/utils/promo";

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const practiceName = formData.get("practiceName") as string;

  const allowed = await rateLimitAll([
    { bucket: "signup-ip", identifier: await clientIp(), limit: 5, windowSeconds: 3600 },
    { bucket: "signup-email", identifier: email ?? "", limit: 3, windowSeconds: 3600 },
  ]);
  if (!allowed) {
    redirect(`/signup?error=${encodeURIComponent("Too many sign-up attempts — please try again in an hour.")}`);
  }

  // Optional promo code. Only free-trial codes make sense before a practice
  // exists (discount codes apply at checkout), and a bad code is rejected
  // here rather than silently dropped, so nobody signs up expecting a longer
  // trial they won't get. Validated again when the practice is created.
  const promoCode = normalizePromoCode(formData.get("promoCode"));
  if (promoCode) {
    const promoAllowed = await rateLimit("signup-promo-ip", await clientIp(), 10, 3600);
    const promo = promoAllowed ? await findUsablePromo(promoCode) : null;
    const promoError = !promoAllowed
      ? "Too many promo code attempts — please try again later."
      : !promo
        ? PROMO_INVALID_MESSAGE
        : promo.kind !== "trial_days"
          ? "That code is a checkout discount — enter it when you subscribe, after your trial."
          : null;
    if (promoError) {
      redirect(`/signup?error=${encodeURIComponent(promoError)}&promo=${encodeURIComponent(promoCode)}`);
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/onboarding`,
      // Carries the practice name across the email-confirmation gap (no
      // session exists yet to write it to a practices row) -- onboarding
      // reads it back from user_metadata so it only has to be asked once.
      data: { practice_name: practiceName, ...(promoCode ? { promo_code: promoCode } : {}) },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  // If email confirmation is required, there's no session yet — send them
  // to check their inbox instead of straight to onboarding.
  if (!data.session) {
    redirect("/signup/check-email");
  }

  redirect("/onboarding");
}
