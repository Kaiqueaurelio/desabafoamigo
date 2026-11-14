import { useEffect, useRef, useState } from "react";
import { ShieldAlert, Eye } from "lucide-react";

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
 *             (padrão típico de ferramenta externa de screenshot) ou entrada em
 *             modo picture-in-picture
 * - `low`   → sinal isolado que pode ter causa benigna (troca de aba, alt-tab)
 */
export function classifyAttempt(
  reason: string,
  ctx: { msSinceLastKey: number },
): ScreenshotSeverity {
  if (/printscreen|atalho de captura/i.test(reason)) return "high";
  if (/picture.in.picture|pip/i.test(reason)) return "medium";
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
 *
 * A cortina (curtain) cobre completamente o conteúdo enquanto:
 *  - a aba está sem foco/visibilidade;
 *  - a página está em picture-in-picture;
 *  - uma tentativa de captura foi acabada de detectar.
 *
 * Acessibilidade:
 *  - Marca `aria-hidden` no conteúdo enquanto está borrado, para leitores
 *    de tela não anunciarem informação obscurecida.
 *  - Alerta usa `role="alert"` + `aria-live="assertive"`.
 *  - Respeita `prefers-reduced-motion`.
 */
export function ScreenshotGuard({
  children,
  onAttempt,
}: {
  children: React.ReactNode;
  onAttempt?: (attempt: ScreenshotAttempt) => void;
}) {
  const [curtain, setCurtain] = useState<null | { reason: string; sticky: boolean }>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const prefersReducedMotion = useRef<boolean>(false);

  useEffect(() => {
    const timers = new Set<number>();
    prefersReducedMotion.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    function flag(reason: string, sticky = false) {
      const attempt: ScreenshotAttempt = {
        reason,
        severity: classifyAttempt(reason, { msSinceLastKey: Date.now() - lastActivityRef.current }),
        userAgent: navigator.userAgent,
      };
      setCurtain({ reason, sticky });
      onAttempt?.(attempt);
      if (!sticky) {
        const dur = prefersReducedMotion.current ? 1200 : 2500;
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          setCurtain((c) => (c && !c.sticky ? null : c));
        }, dur);
        timers.add(timer);
      }
    }

    function bumpActivity() {
      lastActivityRef.current = Date.now();
    }

    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      // Cortina manual: Ctrl/Cmd + H alterna a cortina como painel de privacidade
      if ((e.metaKey || e.ctrlKey) && k === "h") {
        e.preventDefault();
        setCurtain((c) => (c ? null : { reason: "Cortina de privacidade ativada", sticky: true }));
        return;
      }
      // ESC libera cortina manual ou sticky por foco/visibilidade
      if (k === "escape") {
        setCurtain((c) =>
          c && (c.reason.includes("Cortina de privacidade") || /foco|visibilidade/i.test(c.reason))
            ? null
            : c,
        );
      }
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
      const combo = (e.metaKey || e.ctrlKey) && e.shiftKey && ["3", "4", "5", "s"].includes(k);
      if (combo) {
        e.preventDefault();
        flag("Atalho de captura detectado");
        return;
      }
      bumpActivity();
    }

    function onContext(e: MouseEvent) {
      e.preventDefault();
    }
    function onDrag(e: DragEvent) {
      e.preventDefault();
    }

    // Cortina sticky enquanto a aba não estiver visível
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        flag("Aba perdeu a visibilidade", true);
      } else {
        setCurtain((c) => (c?.sticky && /visibilidade|foco|picture/i.test(c.reason) ? null : c));
      }
    }
    function onFocus() {
      setCurtain((c) => (c?.sticky && /foco|visibilidade/i.test(c.reason) ? null : c));
    }
    function onBlur() {
      flag("Janela perdeu o foco", true);
    }

    // Picture-in-Picture: mantém cortina enquanto o modo estiver ativo
    function onPipEnter() {
      flag("Picture-in-Picture ativado", true);
    }
    function onPipLeave() {
      setCurtain((c) => (c?.sticky && /picture/i.test(c.reason) ? null : c));
    }

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", bumpActivity, true);
    window.addEventListener("mousemove", bumpActivity, { passive: true });
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("dragstart", onDrag);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("enterpictureinpicture", onPipEnter as EventListener);
    document.addEventListener("leavepictureinpicture", onPipLeave as EventListener);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", bumpActivity, true);
      window.removeEventListener("mousemove", bumpActivity);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("dragstart", onDrag);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("enterpictureinpicture", onPipEnter as EventListener);
      document.removeEventListener("leavepictureinpicture", onPipLeave as EventListener);
    };
  }, [onAttempt]);

  const blurred = curtain !== null;

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
        inert={blurred || undefined}
      >
        {children}
      </div>
      {curtain && (
        <div
          role="alert"
          aria-live="assertive"
          data-testid="guard-alert"
          className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-background/70 backdrop-blur-sm"
        >
          <div className="flex max-w-sm items-start gap-3 rounded-2xl border border-destructive/40 bg-card px-4 py-3 shadow-lg">
            {curtain.sticky ? (
              <Eye className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            ) : (
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {curtain.sticky ? "Conteúdo oculto" : "Captura bloqueada"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {curtain.reason}. Para proteger o sigilo, a conversa fica oculta enquanto a janela
                não está em foco.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
