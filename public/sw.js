// Staff-side push only (registered from the (app) layout -- see
// push-register.tsx -- never from the client portal). Deliberately no
// fetch handler / offline caching here: this file exists only to receive
// push events and react to notification clicks, not to make Willow work
// offline.

self.addEventListener("push", (event) => {
  let payload = { title: "Willow", body: "You have a new notification.", url: "/notifications" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Non-JSON push payload (shouldn't happen -- sendPushToStaff always
    // sends JSON) -- fall back to the generic notification above.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/dashboard", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clientsList.find((c) => c.url === url);
      if (existing) {
        await existing.focus();
        return;
      }
      // Same-origin tab already open (e.g. sitting on /dashboard) -- reuse
      // it and navigate, rather than piling up a new tab per notification.
      const sameOrigin = clientsList.find((c) => new URL(c.url).origin === self.location.origin);
      if (sameOrigin) {
        await sameOrigin.focus();
        await sameOrigin.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
