import { useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";

export type ScreenshotSeverity = "low" | "medium" | "high";

export interface ScreenshotAttempt {
  reason: string;
  severity: ScreenshotSeverity;
  userAgent: string;
}

/**
 * Classifica a severidade de uma tentativa de captura.
 *
 * - `high`  → sinal inequívoco no navegador (PrintScreen, atalho de captura do SO)
 * - `medium`→ perda de visibilidade/foco imediatamente após atividade do usuário
 *             (padrão típico de ferramenta externa de screenshot)
 * - `low`   → sinal isolado que pode ter causa benigna (troca de aba, alt-tab)
 */
export function classifyAttempt(
  reason: string,
  ctx: { msSinceLastKey: number },
): ScreenshotSeverity {
  if (/printscreen|atalho de captura/i.test(reason)) return "high";
  if (/perdeu o foco|visibilidade/i.test(reason) && ctx.msSinceLastKey < 1500) return "medium";
  return "low";
}

/**
 * ScreenshotGuard — camada de dissuasão contra capturas de tela.
 *
 * IMPORTANTE (honestidade técnica): navegadores web NÃO permitem bloquear
 * capturas de tela do sistema operacional. Isto é uma camada de dissuasão +
 * auditoria. Para bloqueio real em celular, empacote com Capacitor e use
 * FLAG_SECURE (Android) / overlay (iOS). Ver docs/mobile-screenshot-block.md.
 */
export function ScreenshotGuard({
  children,
  onAttempt,
}: {
  children: React.ReactNode;
  onAttempt?: (attempt: ScreenshotAttempt) => void;
}) {
  const [blurred, setBlurred] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const prefersReducedMotion = useRef<boolean>(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    function flag(reason: string) {
      const attempt: ScreenshotAttempt = {
        reason,
        severity: classifyAttempt(reason, { msSinceLastKey: Date.now() - lastActivityRef.current }),
        userAgent: navigator.userAgent,
      };
      setBlurred(true);
      setWarning(reason);
      onAttempt?.(attempt);
      const dur = prefersReducedMotion.current ? 1200 : 2500;
      window.setTimeout(() => setBlurred(false), dur);
      window.setTimeout(() => setWarning(null), dur + 1500);
    }

    function bumpActivity() {
      lastActivityRef.current = Date.now();
    }

    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (k === "printscreen") {
        try { navigator.clipboard?.writeText(" "); } catch { /* ignore */ }
        e.preventDefault();
        flag("Tecla PrintScreen detectada");
        return;
      }
      const combo = (e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "s"].includes(k);
      if (combo) {
        e.preventDefault();
        flag("Atalho de captura detectado");
        return;
      }
      bumpActivity();
    }

    function onContext(e: MouseEvent) { e.preventDefault(); }
    function onDrag(e: DragEvent) { e.preventDefault(); }
    function onVisibility() {
      if (document.visibilityState === "hidden") flag("Aba perdeu a visibilidade");
    }
    function onBlur() { flag("Janela perdeu o foco"); }

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", bumpActivity, true);
    window.addEventListener("mousemove", bumpActivity, { passive: true });
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", bumpActivity, true);
      window.removeEventListener("mousemove", bumpActivity);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, [onAttempt]);

  return (
    <div
      data-testid="screenshot-guard"
      className="relative h-full w-full select-none"
      style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
    >
      <div
        data-testid="guard-content"
        className="h-full w-full motion-safe:transition-[filter] motion-safe:duration-200"
        style={{ filter: blurred ? "blur(18px) saturate(0.6)" : "none" }}
        aria-hidden={blurred || undefined}
      >
        {children}
      </div>
      {blurred && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="guard-alert"
          className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-background/60 backdrop-blur-sm"
        >
          <div className="flex max-w-xs items-start gap-3 rounded-2xl border border-destructive/40 bg-card px-4 py-3 shadow-lg">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-foreground">Captura bloqueada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {warning ?? "Tentativa detectada."} Para proteger o sigilo, capturas desta conversa não são permitidas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
