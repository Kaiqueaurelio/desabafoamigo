/* Desabafo Amigo — Service Worker de mensagens push
 * Este SW é dedicado a Web Push. Não faz cache offline nem intercepta fetch.
 * Registro é seguro em produção; em preview/dev o registro é bloqueado pelo hook.
 */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Desabafo Amigo", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Desabafo Amigo";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/favicon-32.png",
    tag: payload.tag || "desabafo-notify",
    renotify: !!payload.renotify,
    requireInteraction: !!payload.requireInteraction,
    data: {
      url: payload.url || "/",
      ...payload.data,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Focus an existing client if same origin and already on target
      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            await client.focus();
            if (client.navigate) {
              try {
                await client.navigate(targetUrl);
              } catch {}
            } else {
              client.postMessage({ type: "push:navigate", url: targetUrl });
            }
            return;
          }
        } catch {}
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Best-effort: notify open clients so they re-subscribe next time they mount.
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        client.postMessage({ type: "push:resubscribe" });
      }
    })(),
  );
});
