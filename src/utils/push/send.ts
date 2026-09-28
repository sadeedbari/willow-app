import webpush from "web-push";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

// Server-only, staff-side push (see sw.js) -- never sent to the client
// portal. Mirrors sendEmail()'s best-effort contract: never throws, so a
// missing config or a delivery failure can't block the calendar/message/
// booking action it's attached to.
const CONTACT = "mailto:sulosystems@gmail.com";

let vapidConfigured = false;
function ensureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(CONTACT, publicKey, privateKey);
    vapidConfigured = true;
  }
  return true;
}

export async function sendPushToStaff(
  staffId: string,
  payload: { title: string; body: string; url: string },
): Promise<void> {
  if (!ensureVapid()) {
    console.error("VAPID keys not set -- skipping push send");
    return;
  }

  // Always its own service-role client rather than accepting one from the
  // caller: callers reach this from every kind of session context (an
  // authenticated staff session, a client-portal session, or no session at
  // all from the public booking page/inbound-email webhook), and reading
  // another staff member's push_subscriptions rows should never depend on
  // whichever caller happened to trigger the notification.
  const supabase = createServiceRoleClient();
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("staff_id", staffId);

  if (!subscriptions?.length) return;

  const body = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410 = the browser's push service says this subscription is
        // gone for good (uninstalled, permission revoked, endpoint expired)
        // -- clean it up so future sends don't keep retrying a dead target.
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          console.error("Push send failed:", statusCode, err);
        }
      }
    }),
  );

  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }
}
