import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Micro-animação sutil de entrada para o conteúdo autenticado.
 * Respeita `prefers-reduced-motion` e o toggle `.a11y-reduce-motion`.
 */
export function RouteFade({ children }: { children: ReactNode }) {
  const reduce =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("a11y-reduce-motion"));

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
