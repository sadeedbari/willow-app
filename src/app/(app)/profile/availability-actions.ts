"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";

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
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
  redirect("/profile");
}

export async function removeAvailabilityBlock(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  await supabase
    .from("staff_availability")
    .delete()
    .eq("id", formData.get("blockId") as string)
    .eq("staff_id", staff.id);

  revalidatePath("/profile");
  redirect("/profile");
}
