import { useEffect, useRef } from "react";

/** Barra fina de progresso do scroll fixada no topo. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? doc.scrollTop / max : 0;
      el.style.setProperty("--sp", String(p));
      raf = 0;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return <div ref={ref} aria-hidden className="scroll-progress" />;
}

/** Ativa a variável --mx/--my nos elementos com [data-spotlight] para spotlight seguindo o cursor. */
export function SpotlightBinder() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(hover: none)").matches) return;
    const handler = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(".spotlight-card");
      if (!target) return;
      const r = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${e.clientX - r.left}px`);
      target.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", handler, { passive: true });
    return () => window.removeEventListener("pointermove", handler);
  }, []);
  return null;
}

/** Divide o texto em palavras e revela cada uma com atraso em cascata. */
export function WordReveal({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  return (
    <span className={`word-reveal ${className}`}>
      {words.map((w, i) => (
        <span key={i} style={{ animationDelay: `${delay + i * 80}ms` }}>
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </span>
  );
}
