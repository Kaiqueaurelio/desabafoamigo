import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Mensagem sensível revelada apenas enquanto o usuário mantém pressionado
 * (mouse, toque ou tecla Espaço/Enter com foco). Ao soltar, oculta.
 *
 * Acessibilidade:
 * - Elemento com role="button", teclado suportado (Space/Enter para segurar).
 * - aria-pressed reflete estado; aria-label descreve a ação.
 * - Respeita prefers-reduced-motion (sem transição quando o usuário pede).
 */
export function HoldToReveal({
  children,
  label = "Mensagem sensível",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const keyDownRef = useRef(false);

  const on = useCallback(() => setRevealed(true), []);
  const off = useCallback(() => {
    setRevealed(false);
    keyDownRef.current = false;
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === " " || e.key === "Enter") && !keyDownRef.current) {
      e.preventDefault();
      keyDownRef.current = true;
      setRevealed(true);
    }
  }, []);
  const onKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        off();
      }
    },
    [off],
  );

  useEffect(() => {
    // Se a janela perde foco enquanto está segurando, cancela para evitar
    // que o conteúdo fique aberto num screenshot fora de foco.
    const cancel = () => off();
    window.addEventListener("blur", cancel);
    window.addEventListener("visibilitychange", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      window.removeEventListener("visibilitychange", cancel);
    };
  }, [off]);

  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={revealed}
      aria-label={`${label} — pressione e segure para revelar`}
      onMouseDown={on}
      onMouseUp={off}
      onMouseLeave={off}
      onTouchStart={on}
      onTouchEnd={off}
      onTouchCancel={off}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={off}
      className="inline-flex cursor-pointer select-none items-center gap-1 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2 py-0.5 align-middle text-xs font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {revealed ? (
        <>
          <Eye className="size-3" aria-hidden />
          <span className="motion-safe:animate-fade-in">{children}</span>
        </>
      ) : (
        <>
          <EyeOff className="size-3" aria-hidden />
          <span>Segurar para ver</span>
        </>
      )}
    </span>
  );
}
