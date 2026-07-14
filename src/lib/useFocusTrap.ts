import { useEffect, type RefObject } from "react";

/**
 * Focus trap acessível para modais/dialogs feitos à mão.
 * - Ao ativar: guarda o elemento focado, foca o primeiro elemento tabável do container.
 * - Enquanto ativo: cicla Tab/Shift+Tab dentro do container e trata Escape.
 * - Ao desativar: restaura o foco para o elemento anterior.
 *
 * Para componentes shadcn (Dialog/Sheet/AlertDialog) NÃO use este hook —
 * o Radix já implementa focus trap e restore corretamente.
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "audio[controls]",
  "video[controls]",
  "[contenteditable='true']",
].join(",");

export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  containerRef: RefObject<T | null>,
  opts: { onEscape?: () => void; initialFocus?: RefObject<HTMLElement | null> } = {}
) {
  const { onEscape, initialFocus } = opts;

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("data-focus-trap-ignore") && el.offsetParent !== null
      );

    // Foco inicial
    const focusFirst = () => {
      const explicit = initialFocus?.current;
      if (explicit) { explicit.focus(); return; }
      const nodes = getFocusable();
      (nodes[0] ?? container).focus();
    };
    // container precisa ser focável como fallback
    if (!container.hasAttribute("tabindex")) container.setAttribute("tabindex", "-1");
    // pequeno delay para garantir render/mount
    const raf = requestAnimationFrame(focusFirst);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onEscape) {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = getFocusable();
      if (nodes.length === 0) { e.preventDefault(); container?.focus(); return; }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (activeEl === first || !container?.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      // Restaura o foco ao fechar
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        // se ainda existe no DOM
        if (document.body.contains(previouslyFocused)) previouslyFocused.focus();
      }
    };
  }, [active, containerRef, onEscape, initialFocus]);
}
