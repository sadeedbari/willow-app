"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function addAvailabilityBlock(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("staff_availability").insert({
    practice_id: staff.practiceId,
    staff_id: staff.id,
    day_of_week: Number(formData.get("dayOfWeek")),
    start_time: formData.get("startTime") as string,
    end_time: formData.get("endTime") as string,
  });

  if (error) {
    redirect(`/profile/scheduling?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  revalidatePath("/profile/scheduling");
  redirect("/profile/scheduling");
}

export async function removeAvailabilityBlock(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  await supabase
    .from("staff_availability")
    .delete()
    .eq("id", formData.get("blockId") as string)
    .eq("staff_id", staff.id);

  revalidatePath("/profile/scheduling");
  redirect("/profile/scheduling");
}

export async function addAvailabilityOverride(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const isUnavailable = formData.get("isUnavailable") === "on";
  const date = formData.get("date") as string;

  const { error } = await supabase.from("staff_availability_overrides").upsert(
    {
      practice_id: staff.practiceId,
      staff_id: staff.id,
      date,
      is_unavailable: isUnavailable,
      start_time: isUnavailable ? null : (formData.get("startTime") as string),
      end_time: isUnavailable ? null : (formData.get("endTime") as string),
    },
    { onConflict: "staff_id,date" }
  );

  if (error) {
    redirect(`/profile/scheduling?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  revalidatePath("/profile/scheduling");
  redirect("/profile/scheduling");
}

export async function removeAvailabilityOverride(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  await supabase
    .from("staff_availability_overrides")
    .delete()
    .eq("id", formData.get("overrideId") as string)
    .eq("staff_id", staff.id);

  revalidatePath("/profile/scheduling");
  redirect("/profile/scheduling");
}
