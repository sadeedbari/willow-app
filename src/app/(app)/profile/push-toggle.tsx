"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription } from "./push-actions";

// Subscription state lives in the browser (IndexedDB, via the Push API),
// not in a server-known boolean -- "is push on for THIS device" can only be
// answered client-side by asking the service worker's own PushManager, so
// this whole component (not just the button) has to be a client component.
type Status = "checking" | "unsupported" | "off" | "on" | "denied";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        setStatus(sub ? "on" : "off");
      } catch {
        setStatus("off");
      }
    })();
  }, []);

  async function enable() {
    if (!vapidPublicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const { ok } = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
      setStatus(ok ? "on" : "off");
    } catch (err) {
      console.error("Enabling push failed:", err);
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch (err) {
      console.error("Disabling push failed:", err);
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-1 text-[13px] font-bold text-foreground">Push notifications</div>
      <p className="mb-3 max-w-[52ch] text-[12.5px] leading-relaxed text-text-3">
        Get a notification on this device for new messages, booking requests, and appointment
        reminders — even when Willow isn&apos;t open in a tab.
      </p>

      {status === "unsupported" && (
        <p className="text-[12.5px] text-text-3">This browser doesn&apos;t support push notifications.</p>
      )}
      {status === "denied" && (
        <p className="text-[12.5px] text-text-3">
          Notifications are blocked for Willow in this browser. Enable them in your browser&apos;s site
          settings, then reload this page.
        </p>
      )}
      {status === "off" && (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-[13.4px] font-semibold text-text-2 transition hover:bg-surface-2 hover:text-foreground disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable on this device"}
        </button>
      )}
      {status === "on" && (
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-ok">Enabled on this device</span>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="text-[12.5px] font-semibold text-bad disabled:opacity-60"
          >
            {busy ? "Disabling…" : "Disable"}
          </button>
        </div>
      )}
    </div>
  );
}
