import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const updateRequested = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;
    let installingWorker: ServiceWorker | null = null;

    const checkWaiting = () => {
      if (!disposed && registration?.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
        setDismissed(false);
      }
    };
    const onControllerChange = () => {
      if (!disposed && updateRequested.current) window.location.reload();
    };
    const onUpdateFound = () => {
      installingWorker = registration?.installing ?? null;
      installingWorker?.addEventListener("statechange", checkWaiting);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker
      .getRegistration("/")
      .then((reg) => {
        if (disposed || !reg) return;
        registration = reg;
        checkWaiting();
        reg.addEventListener("updatefound", onUpdateFound);
        reg.waiting?.addEventListener("statechange", checkWaiting);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      registration?.removeEventListener("updatefound", onUpdateFound);
      installingWorker?.removeEventListener("statechange", checkWaiting);
      registration?.waiting?.removeEventListener("statechange", checkWaiting);
    };
  }, []);

  if (!waitingWorker || dismissed) return null;

  function updateNow() {
    if (!waitingWorker) return;
    updateRequested.current = true;
    setUpdating(true);
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-primary/20 bg-card p-3 shadow-lg sm:inset-x-auto sm:bottom-5"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Nova versão disponível</p>
        <p className="text-xs text-muted-foreground">
          Atualize o Desabafo Amigo para receber melhorias.
        </p>
      </div>
      <Button size="sm" onClick={updateNow} disabled={updating} className="shrink-0">
        <RefreshCw className={updating ? "mr-1 size-4 animate-spin" : "mr-1 size-4"} />
        {updating ? "Atualizando…" : "Atualizar agora"}
      </Button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dispensar aviso de atualização"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
