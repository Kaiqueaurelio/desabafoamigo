import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

/**
 * Cortina de entrada que aparece na primeira montagem e desaparece após ~1.4s.
 * Usa sessionStorage para não repetir a cada navegação SPA.
 */
export function PageIntro({ duration = 1400 }: { duration?: number }) {
  const reduce = useReducedMotion();
  // Keep the first render identical on server and client to avoid hydration mismatch.
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("intro_seen_v1")) return;
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("intro_seen_v1", "1");
    }, duration);
    return () => clearTimeout(t);
  }, [show, duration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] grid place-items-center bg-gradient-to-br from-brand-soft via-background to-brand-soft"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
          aria-hidden
        >
          <motion.div
            initial={{ scale: reduce ? 1 : 0.85, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { duration: 0.7, ease: [0.22, 0.9, 0.28, 1] },
            }}
            className="flex flex-col items-center gap-6"
          >
            <motion.div
              animate={reduce ? {} : { scale: [1, 1.06, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="drop-shadow-lg"
            >
              <Logo size={96} />
            </motion.div>
            <div className="flex flex-col items-center gap-3">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.5 } }}
                className="text-lg font-semibold text-primary"
              >
                Desabafo Amigo
              </motion.p>
              <div className="h-1 w-40 overflow-hidden rounded-full bg-brand-soft">
                <motion.div
                  className="h-full bg-gradient-to-r from-brand-green via-brand-sky to-brand-green"
                  initial={{ x: "-100%" }}
                  animate={{
                    x: "100%",
                    transition: { duration: 1.1, ease: "easeInOut", repeat: Infinity },
                  }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
