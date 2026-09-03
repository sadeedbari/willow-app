"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/utils/supabase/current-client";
import { findOrCreateThread, notifyStaffOfClientMessage } from "@/utils/messaging";

export async function portalLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}

export async function sendMessageAsClient(formData: FormData) {
  const client = await getCurrentClient();
  const body = (formData.get("body") as string)?.trim();
  if (!body) redirect("/portal");

  const supabase = await createClient();
  const { id: threadId } = await findOrCreateThread(supabase, client.id, client.practiceId);

  await supabase.from("messages").insert({
    thread_id: threadId,
    practice_id: client.practiceId,
    sender_type: "client",
    body,
  });

  await supabase
    .from("message_threads")
    .update({ client_last_read_at: new Date().toISOString() })
    .eq("id", threadId);

  await notifyStaffOfClientMessage(supabase, {
    clientId: client.id,
    clientFullName: client.fullName,
    practiceId: client.practiceId,
    body,
  });

  redirect("/portal");
}
