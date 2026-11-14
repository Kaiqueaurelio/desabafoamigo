// Guarded PWA registration wrapper.
// Registers only in production, only outside Lovable preview/iframe/dev,
// and supports ?sw=off as a kill switch that unregisters and clears caches.

const APP_SW_PATH = "/sw.js";

function isPreviewHost(host: string): boolean {
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
}

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

async function unregisterAppSw(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(APP_SW_PATH);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

async function purgeAppCaches(): Promise<void> {
  if (!("caches" in window)) return;
  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => /^(workbox|app-html|app-assets|app-images)/.test(k))
        .map((k) => caches.delete(k)),
    );
  } catch {
    /* ignore */
  }
}

export async function recoverAppFromRootError(): Promise<void> {
  if (typeof window === "undefined") return;

  // Remove apenas o service worker e os caches pertencentes ao app.
  await unregisterAppSw();
  await purgeAppCaches();

  const recoveryUrl = new URL("/auth", window.location.origin);
  recoveryUrl.searchParams.set("sw", "off");
  recoveryUrl.searchParams.set("recovery", "1");
  window.location.replace(recoveryUrl.toString());
}

export async function registerPwa(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const killSwitch = url.searchParams.get("sw") === "off";

  const shouldRefuse =
    !import.meta.env.PROD ||
    inIframe() ||
    isPreviewHost(window.location.hostname) ||
    killSwitch;

  if (shouldRefuse) {
    await unregisterAppSw();
    if (killSwitch) await purgeAppCaches();
    return;
  }

  try {
    await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });
  } catch {
    /* ignore */
  }
}
