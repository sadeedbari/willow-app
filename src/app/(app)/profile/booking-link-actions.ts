"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { friendlyErrorMessage } from "@/utils/friendly-error";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function enableBookingLink() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("staff")
    .select("booking_slug, full_name")
    .eq("id", staff.id)
    .single();

  const slug = current?.booking_slug ?? slugify(current?.full_name ?? staff.fullName);

  // First attempt with the plain slugified name; on a uniqueness collision
  // (someone else already has this exact slug), retry once with a short
  // random suffix rather than surfacing a raw constraint error.
  let { error } = await supabase
    .from("staff")
    .update({ booking_enabled: true, booking_slug: slug })
    .eq("id", staff.id);

  if (error?.code === "23505") {
    ({ error } = await supabase
      .from("staff")
      .update({ booking_enabled: true, booking_slug: `${slug}-${Date.now().toString(36).slice(-4)}` })
      .eq("id", staff.id));
  }

  if (error) {
    redirect(`/profile/scheduling?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  redirect("/profile/scheduling?saved=1");
}

export async function disableBookingLink() {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  await supabase.from("staff").update({ booking_enabled: false }).eq("id", staff.id);

  redirect("/profile/scheduling?saved=1");
}

export async function updateBookingSlug(formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const raw = (formData.get("slug") as string) ?? "";
  const slug = slugify(raw);

  if (!slug) {
    redirect(`/profile/scheduling?error=${encodeURIComponent("Please enter a link name")}`);
  }

  const { error } = await supabase.from("staff").update({ booking_slug: slug }).eq("id", staff.id);

  if (error) {
    redirect(
      `/profile/scheduling?error=${encodeURIComponent(
        error.code === "23505" ? "That link name is already taken — please choose another." : friendlyErrorMessage(error)
      )}`
    );
  }

  redirect("/profile/scheduling?saved=1");
}
