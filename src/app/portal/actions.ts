"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/utils/supabase/current-client";
import { sendEmail } from "@/utils/resend/send";

export async function portalLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/portal/login");
}

async function findOrCreateThread(clientId: string, practiceId: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("message_threads")
    .select("id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("message_threads")
    .insert({ practice_id: practiceId, client_id: clientId })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Could not start conversation");
  return created.id;
}

export async function sendMessageAsClient(formData: FormData) {
  const client = await getCurrentClient();
  const body = (formData.get("body") as string)?.trim();
  if (!body) redirect("/portal");

  const supabase = await createClient();
  const threadId = await findOrCreateThread(client.id, client.practiceId);

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

  const { data: recipientEmail } = await supabase.rpc("get_my_message_recipient_email");
  if (recipientEmail) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendEmail({
      to: recipientEmail,
      subject: `New secure message from ${client.fullName}`,
      html: `<p>You have a new secure message from ${client.fullName}.</p><p><a href="${siteUrl}/messages/${client.id}">Log in to view and reply</a></p>`,
    });
  }

  redirect("/portal");
}
