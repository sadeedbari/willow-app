"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function revokeInvitation(invitationId: string) {
  const supabase = await createClient();
  await supabase
    .from("staff_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);
  revalidatePath("/staff");
}
