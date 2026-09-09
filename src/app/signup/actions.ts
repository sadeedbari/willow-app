"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const practiceName = formData.get("practiceName") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/onboarding`,
      // Carries the practice name across the email-confirmation gap (no
      // session exists yet to write it to a practices row) -- onboarding
      // reads it back from user_metadata so it only has to be asked once.
      data: { practice_name: practiceName },
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
