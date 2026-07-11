/**
 * Notificações do navegador + som + badge no título da aba.
 * Usado por voluntários quando novas pessoas entram na fila.
 */
const TITLE_KEY = "desabafo:title:orig";

export async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

export function notifyUser(title: string, body: string) {
  if (typeof window === "undefined") return;
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(title, { body, icon: "/apple-touch-icon.png", tag: "desabafo-queue" });
      setTimeout(() => n.close(), 8000);
    } catch { /* noop */ }
  }
  playPing();
}

let audioCtx: AudioContext | null = null;
export function playPing() {
  if (typeof window === "undefined") return;
  try {
    audioCtx ||= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.42);
  } catch { /* noop */ }
}

export function setTitleBadge(count: number) {
  if (typeof document === "undefined") return;
  if (!sessionStorage.getItem(TITLE_KEY)) sessionStorage.setItem(TITLE_KEY, document.title);
  const orig = sessionStorage.getItem(TITLE_KEY) ?? document.title;
  document.title = count > 0 ? `(${count}) ${orig}` : orig;
}
