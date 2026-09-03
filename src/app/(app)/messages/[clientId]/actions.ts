"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { sendEmail } from "@/utils/resend/send";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { findOrCreateThread, replyToAddressFor } from "@/utils/messaging";

export async function sendMessageAsStaff(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;
  const body = (formData.get("body") as string)?.trim();

  if (staff.role !== "practice_admin" && staff.role !== "clinician") {
    redirect(`/messages/${clientId}`);
  }
  if (!body) redirect(`/messages/${clientId}`);

  const supabase = await createClient();
  const { id: threadId, inboundToken } = await findOrCreateThread(supabase, clientId, staff.practiceId);

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    practice_id: staff.practiceId,
    sender_type: "staff",
    sender_staff_id: staff.id,
    body,
  });

  if (error) {
    redirect(`/messages/${clientId}?error=${encodeURIComponent(friendlyErrorMessage(error))}`);
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

  if (clientRow?.email) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const howToReply = clientRow.portal_user_id
      ? `Reply directly to this email, or <a href="${siteUrl}/portal">log in to your client portal</a> to view the full conversation.`
      : `Reply directly to this email to respond.`;
    await sendEmail({
      to: clientRow.email,
      subject: `New secure message from ${staff.practiceName}`,
      html: `<p>You have a new message from ${staff.practiceName}:</p><p>${body}</p><p>${howToReply}</p>`,
      replyTo: replyToAddressFor(inboundToken),
    });
  }

  redirect(`/messages/${clientId}`);
}
