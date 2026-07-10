import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

/**
 * ScreenshotGuard — camada de dissuasão contra capturas de tela.
 *
 * IMPORTANTE: navegadores web NÃO permitem bloquear capturas de tela do SO
 * (PrintScreen no Windows, Cmd+Shift+3/4/5 no macOS, botões de hardware no
 * celular). Não existe API pública para isso. Aplicamos apenas camadas de
 * dissuasão + auditoria:
 *   1. Interceptar teclas conhecidas de captura no navegador.
 *   2. Bloquear menu de contexto, arrastar e seleção de texto.
 *   3. Detectar perda de foco/visibilidade e borrar o conteúdo — uma
 *      ferramenta externa de screenshot geralmente rouba o foco.
 *   4. Emitir um evento `screenshot-attempt` para log/telemetria.
 */
export function ScreenshotGuard({
  children,
  onAttempt,
}: {
  children: React.ReactNode;
  onAttempt?: (reason: string) => void;
}) {
  const [blurred, setBlurred] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    function flag(reason: string) {
      setBlurred(true);
      setWarning(reason);
      onAttempt?.(reason);
      window.setTimeout(() => setBlurred(false), 2500);
      window.setTimeout(() => setWarning(null), 4000);
    }

    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      // PrintScreen (Windows/Linux)
      if (k === "printscreen") {
        try {
          navigator.clipboard?.writeText(" ");
        } catch {
          /* ignore */
        }
        e.preventDefault();
        flag("Tecla PrintScreen detectada");
        return;
      }
      // macOS: Cmd+Shift+3 / 4 / 5, Windows: Win+Shift+S / Ctrl+Shift+S
      const combo = (e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "s"].includes(k);
      if (combo) {
        e.preventDefault();
        flag("Atalho de captura detectado");
      }
    }

    function onContext(e: MouseEvent) {
      e.preventDefault();
    }
    function onDrag(e: DragEvent) {
      e.preventDefault();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        flag("Aba perdeu o foco");
      }
    }
    function onBlur() {
      flag("Janela perdeu o foco");
    }

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [onAttempt]);

  return (
    <div className="relative h-full w-full select-none" style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}>
      <div
        className="h-full w-full transition-[filter] duration-200"
        style={{ filter: blurred ? "blur(18px) saturate(0.6)" : "none" }}
      >
        {children}
      </div>
      {blurred && (
        <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-background/60 backdrop-blur-sm">
          <div className="flex max-w-xs items-start gap-3 rounded-2xl border border-destructive/40 bg-card px-4 py-3 shadow-lg">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-foreground">Captura bloqueada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {warning ?? "Tentativa detectada."} Para proteger o sigilo, capturas de tela desta conversa não são permitidas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
