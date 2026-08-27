"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  // Route based on whether this user has finished the practice-signup
  // (bootstrap) step yet, not just whether they're authenticated.
  const { data: practiceId } = await supabase.rpc("my_practice_id");

  redirect(practiceId ? "/dashboard" : "/onboarding");
}
