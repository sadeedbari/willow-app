"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { sendNewPracticeSignupEmail } from "@/utils/admin-notification-email";

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
    redirect(`/onboarding?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
  }

  if (user.email) {
    await sendNewPracticeSignupEmail({
      practiceName,
      ownerFullName,
      ownerEmail: user.email,
    });
  }

  redirect("/dashboard");
}
