"use server";

import { randomBytes } from "node:crypto";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { normalizePromoCode, PROMO_CODE_PATTERN } from "@/utils/promo";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { zonedTimeToUtc } from "@/utils/timezone";

const PAGE = "/platform/promo-codes";

// Platform admins are Sulo Systems' own staff (the platform_admins table), not
// practice admins -- everyone else gets a plain 404 so the screen isn't even
// discoverable. The database enforces the same rule through RLS regardless.
async function requirePlatformAdmin() {
  await getCurrentStaff();
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_platform_admin");
  if (!isAdmin) notFound();
  return supabase;
}

function fail(message: string): never {
  redirect(`${PAGE}?error=${encodeURIComponent(message)}`);
}

function optionalInt(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isInteger(n) ? n : NaN;
}

// Unambiguous characters only (no 0/O, 1/I), so a code read aloud or typed
// from an email is hard to get wrong.
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function createPromoCode(formData: FormData) {
  const supabase = await requirePlatformAdmin();

  const kind = formData.get("kind");
  if (kind !== "trial_days" && kind !== "discount") fail("Choose what kind of code this is.");

  const code = normalizePromoCode(formData.get("code")) || generateCode();
  if (!PROMO_CODE_PATTERN.test(code)) {
    fail("Codes must be 3–32 characters: letters, numbers, dashes or underscores.");
  }

  const row: Record<string, unknown> = {
    code,
    kind,
    description: String(formData.get("description") ?? "").trim().slice(0, 200) || null,
    active: true,
    created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
  };

  if (kind === "trial_days") {
    const trialDays = optionalInt(formData.get("trialDays"));
    if (trialDays === null || Number.isNaN(trialDays) || trialDays < 1 || trialDays > 730) {
      fail("Trial length must be between 1 and 730 days.");
    }
    row.trial_days = trialDays;
  } else {
    const percentOff = optionalInt(formData.get("percentOff"));
    const months = optionalInt(formData.get("discountMonths"));
    if (percentOff === null || Number.isNaN(percentOff) || percentOff < 1 || percentOff > 100) {
      fail("Percent off must be between 1 and 100.");
    }
    if (months === null || Number.isNaN(months) || months < 1 || months > 36) {
      fail("Discount length must be between 1 and 36 months.");
    }
    row.percent_off = percentOff;
    row.discount_months = months;
  }

  const maxRedemptions = optionalInt(formData.get("maxRedemptions"));
  if (maxRedemptions !== null && (Number.isNaN(maxRedemptions) || maxRedemptions < 1)) {
    fail("Max redemptions must be a whole number of 1 or more, or left blank for unlimited.");
  }
  row.max_redemptions = maxRedemptions;

  // The last day the code works, through the end of that day in the
  // practices' timezone.
  const expiresOn = String(formData.get("expiresOn") ?? "").trim();
  if (expiresOn) {
    const end = zonedTimeToUtc(expiresOn, "23:59");
    if (Number.isNaN(end.getTime())) fail("That expiry date isn't valid.");
    row.expires_at = end.toISOString();
  }

  const { error } = await supabase.from("promo_codes").insert(row);
  if (error) {
    fail(
      error.code === "23505"
        ? `The code ${code} already exists — pick a different one.`
        : friendlyErrorMessage(error, "Could not create that code."),
    );
  }

  revalidatePath(PAGE);
  redirect(`${PAGE}?created=${encodeURIComponent(code)}`);
}

export async function setPromoCodeActive(formData: FormData) {
  const supabase = await requirePlatformAdmin();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  const { error } = await supabase.from("promo_codes").update({ active }).eq("id", id);
  if (error) fail(friendlyErrorMessage(error, "Could not update that code."));

  revalidatePath(PAGE);
  redirect(PAGE);
}
