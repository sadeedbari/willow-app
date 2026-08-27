"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function createPractice(formData: FormData) {
  const practiceName = formData.get("practiceName") as string;
  const ownerFullName = formData.get("ownerFullName") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("create_practice_with_owner", {
    practice_name: practiceName,
    owner_full_name: ownerFullName,
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
