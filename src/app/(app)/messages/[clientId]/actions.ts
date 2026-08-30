"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { sendEmail } from "@/utils/resend/send";

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

export async function sendMessageAsStaff(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;
  const body = (formData.get("body") as string)?.trim();

  if (staff.role !== "practice_admin" && staff.role !== "clinician") {
    redirect(`/messages/${clientId}`);
  }
  if (!body) redirect(`/messages/${clientId}`);

  const supabase = await createClient();
  const threadId = await findOrCreateThread(clientId, staff.practiceId);

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    practice_id: staff.practiceId,
    sender_type: "staff",
    sender_staff_id: staff.id,
    body,
  });

  if (error) {
    redirect(`/messages/${clientId}?error=${encodeURIComponent(error.message)}`);
  }

  await supabase
    .from("message_threads")
    .update({ staff_last_read_at: new Date().toISOString() })
    .eq("id", threadId);

  const { data: clientRow } = await supabase
    .from("clients")
    .select("email, portal_user_id")
    .eq("id", clientId)
    .single();

  if (clientRow?.email && clientRow.portal_user_id) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendEmail({
      to: clientRow.email,
      subject: `New secure message from ${staff.practiceName}`,
      html: `<p>You have a new secure message from ${staff.practiceName}.</p><p><a href="${siteUrl}/portal">Log in to view and reply</a></p>`,
    });
  }

  redirect(`/messages/${clientId}`);
}
