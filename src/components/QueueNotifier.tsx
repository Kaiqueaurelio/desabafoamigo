import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { ensureNotifyPermission, notifyUser, setTitleBadge } from "@/lib/notify";

/**
 * Componente controlador para voluntários — mostra botão de ativar
 * notificações e dispara alerta sonoro + badge quando `count` sobe.
 */
export function QueueNotifier({ count }: { count: number }) {
  const [enabled, setEnabled] = useState(false);
  const last = useRef(count);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    if (enabled && count > last.current) {
      notifyUser("Nova pessoa na fila", "Alguém está aguardando escuta agora.");
    }
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      setTitleBadge(count);
    } else {
      setTitleBadge(0);
    }
    last.current = count;
  }, [count, enabled]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") setTitleBadge(0); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  async function toggle() {
    if (enabled) { setEnabled(false); return; }
    const ok = await ensureNotifyPermission();
    setEnabled(ok);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
      aria-pressed={enabled}
      title={enabled ? "Notificações ativas" : "Ativar notificações"}
    >
      {enabled ? <Bell className="size-3.5 text-primary" /> : <BellOff className="size-3.5 text-muted-foreground" />}
      {enabled ? "Notificações ativas" : "Ativar notificações"}
    </button>
  );
}
