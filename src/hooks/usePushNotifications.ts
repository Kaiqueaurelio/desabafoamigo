import { useCallback, useEffect, useState } from "react";
import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush, sendTestPush } from "@/lib/push.functions";

const SW_URL = "/push-sw.js";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function arrayBufferToBase64(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function isPreviewOrDev(): boolean {
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host.endsWith(".lovableproject.com") || host === "lovableproject.com") return true;
  if (host.endsWith(".lovableproject-dev.com") || host === "lovableproject-dev.com") return true;
  if (host.endsWith(".beta.lovable.dev") || host === "beta.lovable.dev") return true;
  return false;
}

export type PushStatus = "unsupported" | "blocked" | "denied" | "prompt" | "granted";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("unsupported");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPreviewOrDev()) {
      setPreview(true);
      setStatus("blocked");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "prompt");
  }, []);

  const enable = useCallback(async () => {
    if (typeof window === "undefined" || isPreviewOrDev()) return { ok: false as const, reason: "preview" };
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return { ok: false as const, reason: "unsupported" };
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "prompt");
        return { ok: false as const, reason: perm };
      }
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
      await navigator.serviceWorker.ready;
      const { publicKey } = await getVapidPublicKey();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      const keys = sub.toJSON().keys || {};
      await subscribeToPush({
        data: {
          endpoint: sub.endpoint,
          p256dh: keys.p256dh || arrayBufferToBase64(sub.getKey("p256dh")),
          auth: keys.auth || arrayBufferToBase64(sub.getKey("auth")),
          userAgent: navigator.userAgent.slice(0, 500),
        },
      });
      setStatus("granted");
      return { ok: true as const };
    } catch (err) {
      console.error("[push] enable failed", err);
      return { ok: false as const, reason: "error" as const, error: err };
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    if (typeof window === "undefined") return { ok: false as const };
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_URL);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      return { ok: true as const };
    } catch (err) {
      console.error("[push] disable failed", err);
      return { ok: false as const, error: err };
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(async () => {
    try {
      return await sendTestPush();
    } catch (err) {
      console.error("[push] test failed", err);
      return { sent: 0, failed: 0 };
    }
  }, []);

  const resubscribe = useCallback(async () => {
    await disable();
    return enable();
  }, [disable, enable]);

  return { status, busy, preview, enable, disable, test, resubscribe };
}
