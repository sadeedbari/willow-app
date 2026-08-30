"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { STARTER_SERVICE_CODES } from "./starter-codes";

function dollarsToCents(value: FormDataEntryValue | null) {
  const n = parseFloat((value as string) ?? "0");
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

function requireAdmin(role: string) {
  if (role !== "practice_admin") {
    redirect("/settings/services");
  }
}

export async function loadStarterServiceCodes() {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  const supabase = await createClient();
  await supabase
    .from("service_codes")
    .upsert(
      STARTER_SERVICE_CODES.map((c) => ({ ...c, practice_id: staff.practiceId })),
      { onConflict: "practice_id,code", ignoreDuplicates: true }
    );

  revalidatePath("/settings/services");
  redirect("/settings/services");
}

export async function addServiceCode(formData: FormData) {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  const supabase = await createClient();
  const { error } = await supabase.from("service_codes").insert({
    practice_id: staff.practiceId,
    code: formData.get("code") as string,
    description: formData.get("description") as string,
    default_rate_cents: dollarsToCents(formData.get("rate")),
  });

  if (error) {
    redirect(`/settings/services?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/services");
  redirect("/settings/services");
}

export async function updateServiceCodeRate(formData: FormData) {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  const supabase = await createClient();
  await supabase
    .from("service_codes")
    .update({
      description: formData.get("description") as string,
      default_rate_cents: dollarsToCents(formData.get("rate")),
    })
    .eq("id", formData.get("serviceCodeId") as string);

  revalidatePath("/settings/services");
  redirect("/settings/services");
}

export async function toggleServiceCodeActive(formData: FormData) {
  const staff = await getCurrentStaff();
  requireAdmin(staff.role);

  const supabase = await createClient();
  await supabase
    .from("service_codes")
    .update({ active: formData.get("nextActive") === "true" })
    .eq("id", formData.get("serviceCodeId") as string);

  revalidatePath("/settings/services");
  redirect("/settings/services");
}
