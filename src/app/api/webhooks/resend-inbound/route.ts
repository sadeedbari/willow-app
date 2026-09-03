import { Resend } from "resend";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { stripQuotedReply, notifyStaffOfClientMessageByClientId } from "@/utils/messaging";

// Receives "a client replied to a staff message by email" from Resend's
// Inbound feature. No user session exists here -- Resend is calling this
// endpoint directly -- so authorization is entirely: (1) the svix signature
// proves the request really came from Resend, and (2) the reply+<token>@...
// address encodes which thread this belongs to (same trust model as the
// existing consent-form access_token magic links).
export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("RESEND_WEBHOOK_SECRET not set -- rejecting inbound webhook");
    return new Response("Not configured", { status: 500 });
  }

  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing signature headers", { status: 401 });
  }

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret,
    });
  } catch (err) {
    console.error("Inbound webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 401 });
  }

  if (event.type !== "email.received") {
    return Response.json({ ok: true, skipped: "not an email.received event" });
  }

  const supabase = createServiceRoleClient();

  // Already processed this exact inbound email (Resend retries on non-2xx).
  const { data: alreadyStored } = await supabase
    .from("messages")
    .select("id")
    .eq("inbound_email_id", event.data.email_id)
    .maybeSingle();
  if (alreadyStored) {
    return Response.json({ ok: true, skipped: "already processed" });
  }

  const domain = process.env.INBOUND_EMAIL_DOMAIN ?? "reply.therapybyniha.com";
  const tokenPattern = new RegExp(`^reply\\+([^@]+)@${domain.replace(/\./g, "\\.")}$`, "i");
  const recipient = event.data.to.find((addr) => tokenPattern.test(addr));
  const token = recipient ? tokenPattern.exec(recipient)?.[1] : undefined;

  if (!token) {
    console.error("Inbound email has no recognizable reply address:", event.data.to);
    return Response.json({ ok: true, skipped: "no thread token in recipient" });
  }

  const { data: thread } = await supabase
    .from("message_threads")
    .select("id, client_id, practice_id, clients(full_name)")
    .eq("inbound_token", token)
    .maybeSingle();

  if (!thread) {
    console.error("Inbound email token did not match any thread:", token);
    return Response.json({ ok: true, skipped: "unknown thread token" });
  }

  const email = await resend.emails.receiving.get(event.data.email_id);
  if (!email.data) {
    console.error("Could not fetch inbound email body:", event.data.email_id, email.error);
    return new Response("Could not fetch email", { status: 502 });
  }

  const headers = email.data.headers ?? {};
  const autoSubmitted = headers["auto-submitted"] ?? headers["Auto-Submitted"];
  if (autoSubmitted && autoSubmitted.toLowerCase() !== "no") {
    return Response.json({ ok: true, skipped: "auto-submitted email" });
  }

  const rawText = email.data.text ?? (email.data.html ? stripHtml(email.data.html) : "");
  const body = stripQuotedReply(rawText ?? "").trim();

  if (!body) {
    return Response.json({ ok: true, skipped: "empty body after stripping quoted reply" });
  }

  await supabase.from("messages").insert({
    thread_id: thread.id,
    practice_id: thread.practice_id,
    sender_type: "client",
    body,
    inbound_email_id: event.data.email_id,
  });

  await supabase
    .from("message_threads")
    .update({ client_last_read_at: new Date().toISOString() })
    .eq("id", thread.id);

  const clientFullName = (thread.clients as unknown as { full_name: string } | null)?.full_name ?? "Your client";
  await notifyStaffOfClientMessageByClientId(supabase, {
    clientId: thread.client_id,
    clientFullName,
    practiceId: thread.practice_id,
    body,
  });

  return Response.json({ ok: true });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}
