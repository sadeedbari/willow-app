"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function updateProfile(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("staff")
    .update({
      full_name: formData.get("fullName") as string,
      credential: (formData.get("credential") as string) || null,
      license_number: (formData.get("licenseNumber") as string) || null,
      license_province: (formData.get("licenseProvince") as string) || null,
      license_expiry: (formData.get("licenseExpiry") as string) || null,
      specialty: (formData.get("specialty") as string) || null,
      bio: (formData.get("bio") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      notify_on_message: formData.get("notifyOnMessage") === "on",
      notify_on_booking_request: formData.get("notifyOnBookingRequest") === "on",
    })
    .eq("id", staff.id);

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  // The profile-completion ring lives in the shared (app) layout, which
  // Next.js otherwise keeps cached across this redirect -- without this the
  // ring would show stale data until an unrelated full page load.
  revalidatePath("/", "layout");
  redirect("/profile?saved=1");
}
