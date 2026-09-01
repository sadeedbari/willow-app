"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/utils/supabase/current-client";
import { SELF_BOOKABLE_TYPES, type SelfBookableType } from "@/utils/appointment-types";

export async function bookAppointment(formData: FormData) {
  const client = await getCurrentClient();
  const supabase = await createClient();

  const startsAt = formData.get("startsAt") as string;
  const date = formData.get("date") as string;
  const type = formData.get("type") as string;
  const backParams = `date=${date}&type=${type}`;

  if (!SELF_BOOKABLE_TYPES.includes(type as SelfBookableType)) {
    redirect(`/portal/book?${backParams}&error=${encodeURIComponent("Invalid session type")}`);
  }

  const { error } = await supabase.rpc("book_appointment_as_client", {
    p_starts_at: startsAt,
    p_type: type,
  });

  if (error) {
    redirect(`/portal/book?${backParams}&error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/portal/book?${backParams}&booked=1`);
}
