"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/utils/supabase/current-staff";
import { sendEmail } from "@/utils/resend/send";
import { friendlyErrorMessage } from "@/utils/friendly-error";
import { findOrCreateThread, replyToAddressFor } from "@/utils/messaging";
import { escapeHtml, escapeHtmlWithBreaks } from "@/utils/escape-html";

export async function sendMessageAsStaff(formData: FormData) {
  const staff = await getCurrentStaff();
  const clientId = formData.get("clientId") as string;
  const body = (formData.get("body") as string)?.trim();

  if (staff.role !== "practice_admin" && staff.role !== "clinician" && staff.role !== "front_desk") {
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
    const practiceName = escapeHtml(staff.practiceName);
    // A client with a portal login gets a notification only -- the message
    // itself stays behind their login instead of sitting in an inbox.
    // A client without one has no other way to read it, so the (escaped)
    // text is included and they can reply straight from their email.
    const html = clientRow.portal_user_id
      ? `<p>You have a new secure message from ${practiceName}.</p><p><a href="${siteUrl}/portal">Log in to your client portal to read it and reply</a>.</p>`
      : `<p>You have a new message from ${practiceName}:</p><p>${escapeHtmlWithBreaks(body)}</p><p>Reply directly to this email to respond.</p>`;
    await sendEmail({
      to: clientRow.email,
      subject: `New secure message from ${staff.practiceName}`,
      html,
      replyTo: replyToAddressFor(inboundToken),
    });
  }

  redirect(`/messages/${clientId}`);
}
