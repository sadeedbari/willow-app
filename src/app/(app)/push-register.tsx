"use client";

import { useEffect } from "react";

// Registers the service worker silently (no permission prompt -- that only
// happens when a staff member explicitly clicks "Enable" in Profile, see
// push-toggle.tsx). Rendered once from (app)/layout.tsx so the worker is
// ready by the time someone visits Profile, instead of registering it
// lazily on that one page. Never rendered from the portal layout -- push
// is staff-only.
export function PushRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    }
  }, []);

  return null;
}
