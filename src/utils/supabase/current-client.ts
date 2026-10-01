import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export type CurrentClient = {
  id: string;
  fullName: string;
  practiceId: string;
  practiceName: string;
  practiceLogoUrl: string | null;
  defaultAppointmentType: string | null;
};

// Mirrors getCurrentStaff() for the client portal side. Redirects rather
// than returning null -- every caller is inside /portal, where no matching
// client row means the account hasn't been linked (or isn't a client at all).
export async function getCurrentClient(): Promise<CurrentClient> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  const { data } = await supabase
    .from("clients")
    .select("id, full_name, practice_id, default_appointment_type, practices(name, logo_url)")
    .eq("portal_user_id", user.id)
    .single();

  if (!data) {
    redirect("/portal/login?error=No+client+account+found+for+this+login");
  }

  const practice = data.practices as unknown as { name: string; logo_url: string | null } | null;

  return {
    id: data.id,
    fullName: data.full_name,
    practiceId: data.practice_id,
    practiceName: practice?.name ?? "Your practice",
    practiceLogoUrl: practice?.logo_url ?? null,
    defaultAppointmentType: data.default_appointment_type,
  };
}
