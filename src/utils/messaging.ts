import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/utils/resend/send";
import { friendlyErrorMessage } from "@/utils/friendly-error";

// A thread is unread from one side the moment the other side has posted
// since that side's last visit -- same rule for staff (staff_last_read_at)
// and for the client portal (client_last_read_at), so one function covers
// both directions rather than each caller re-deriving the comparison.
export function isThreadUnread(lastReadAt: string | null, updatedAt: string): boolean {
  return !lastReadAt || new Date(updatedAt) > new Date(lastReadAt);
}

// Shared by the staff-side ("/messages/[clientId]") and client-portal
// ("/portal") send actions -- both need the same "one thread per client"
// lookup-or-create, and the inbound-email webhook needs the resulting
// inbound_token to route a reply back to this thread.
export async function findOrCreateThread(
  supabase: SupabaseClient,
  clientId: string,
  practiceId: string,
): Promise<{ id: string; inboundToken: string }> {
  const { data: existing } = await supabase
    .from("message_threads")
    .select("id, inbound_token")
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing) return { id: existing.id, inboundToken: existing.inbound_token };

  const { data: created, error } = await supabase
    .from("message_threads")
    .insert({ practice_id: practiceId, client_id: clientId })
    .select("id, inbound_token")
    .single();

  if (error || !created) throw new Error(friendlyErrorMessage(error, "Could not start conversation"));
  return { id: created.id, inboundToken: created.inbound_token };
}

// The Reply-To address on every staff->client message. A client replying
// straight from their inbox (no portal login needed) sends to this address;
// the inbound-email webhook (src/app/api/webhooks/resend-inbound/route.ts)
// looks up the thread by the token in the local part.
export function replyToAddressFor(inboundToken: string): string {
  const domain = process.env.INBOUND_EMAIL_DOMAIN ?? "reply.therapybyniha.com";
  return `reply+${inboundToken}@${domain}`;
}

// Used by the portal send action ONLY. notify_message_recipient() and
// get_my_message_recipient_email() both resolve "which client sent this"
// via my_client_id(), which reads auth.uid() -- so this only works when
// `supabase` is a real authenticated client session. Calling it from a
// service-role context (no session, auth.uid() is null) would silently
// no-op both RPCs. For that case use notifyStaffOfClientMessageByClientId
// below instead.
export async function notifyStaffOfClientMessage(
  supabase: SupabaseClient,
  params: { clientId: string; clientFullName: string; practiceId: string; body: string },
) {
  await supabase.rpc("notify_message_recipient", { p_preview: params.body.slice(0, 140) });

  const { data: recipientEmail } = await supabase.rpc("get_my_message_recipient_email");
  if (recipientEmail) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendEmail({
      to: recipientEmail,
      subject: `New secure message from ${params.clientFullName}`,
      html: `<p>You have a new secure message from ${params.clientFullName}.</p><p><a href="${siteUrl}/messages/${params.clientId}">Log in to view and reply</a></p>`,
    });
  }
}

// Used by the inbound-email webhook, which has no user session at all (it's
// an unauthenticated call from Resend, verified only by webhook signature).
// Takes clientId explicitly rather than deriving it from auth.uid(), and
// talks to `notifications` directly since the service-role client bypasses
// RLS anyway -- resolve_client_notification_recipient() is safe to call this
// way because it's parameterized by clientId, not by session.
export async function notifyStaffOfClientMessageByClientId(
  supabase: SupabaseClient,
  params: { clientId: string; clientFullName: string; practiceId: string; body: string },
) {
  const { data: recipientStaffId } = await supabase.rpc("resolve_client_notification_recipient", {
    p_client_id: params.clientId,
  });
  if (!recipientStaffId) return;

  await supabase.from("notifications").insert({
    practice_id: params.practiceId,
    staff_id: recipientStaffId,
    type: "new_message",
    title: `New message from ${params.clientFullName}`,
    body: params.body.slice(0, 140),
    link: `/messages/${params.clientId}`,
  });

  const { data: recipientStaff } = await supabase
    .from("staff")
    .select("email, notify_on_message")
    .eq("id", recipientStaffId)
    .single();

  if (recipientStaff?.email && recipientStaff.notify_on_message) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    await sendEmail({
      to: recipientStaff.email,
      subject: `New secure message from ${params.clientFullName}`,
      html: `<p>You have a new secure message from ${params.clientFullName}.</p><p><a href="${siteUrl}/messages/${params.clientId}">Log in to view and reply</a></p>`,
    });
  }
}

// Best-effort strip of the quoted history from a plain-text email reply.
// Mail clients don't agree on a machine-readable "here's the new part"
// marker, so this is a heuristic: cut at the first line that looks like a
// quote header or a quoted ("> ") line, which covers Gmail, Apple Mail, and
// Outlook's plain-text reply formats. Worst case (an unrecognized client) we
// keep the full text including quoted history -- never worse than doing
// nothing.
const QUOTE_MARKERS = [
  /^\s*On .+ wrote:\s*$/m,
  /^-{2,}\s*Original Message\s*-{2,}/m,
  /^From:\s.+$/m,
  /^\s*>/m,
];

export function stripQuotedReply(text: string): string {
  let cutAt = text.length;
  for (const marker of QUOTE_MARKERS) {
    const match = marker.exec(text);
    if (match && match.index < cutAt) cutAt = match.index;
  }
  return text.slice(0, cutAt).trim();
}
