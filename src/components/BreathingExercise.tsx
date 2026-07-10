import { useEffect, useState } from "react";
import { Wind, X } from "lucide-react";

// Ciclo 4-7-8: inspira 4s, segura 7s, solta 8s.
const PHASES = [
  { label: "Inspire pelo nariz", seconds: 4, scale: 1 },
  { label: "Segure o ar", seconds: 7, scale: 1 },
  { label: "Solte pela boca", seconds: 8, scale: 0.6 },
] as const;

export function BreathingButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/40"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-primary">
          <Wind className="size-4" />
        </span>
        <span className="text-left">
          <span className="block text-sm font-semibold">Respiração guiada</span>
          <span className="block text-[11px] text-muted-foreground">Acalme-se em 1 minuto</span>
        </span>
      </button>
      {open && <BreathingModal onClose={() => setOpen(false)} />}
    </>
  );
}

function BreathingModal({ onClose }: { onClose: () => void }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(PHASES[0].seconds);

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        setPhaseIdx((i) => (i + 1) % PHASES.length);
        return 0;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setRemaining(PHASES[phaseIdx].seconds);
  }, [phaseIdx]);

  const phase = PHASES[phaseIdx];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-2xl">
        <button onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Respiração 4-7-8</p>
        <div className="my-8 grid place-items-center">
          <div
            className="grid size-48 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 text-primary transition-transform ease-in-out"
            style={{ transform: `scale(${phase.scale})`, transitionDuration: `${phase.seconds}s` }}
          >
            <span className="text-4xl font-bold">{remaining || phase.seconds}</span>
          </div>
        </div>
        <p className="text-lg font-semibold text-foreground">{phase.label}</p>
        <p className="mt-2 text-xs text-muted-foreground">Repita quantas vezes quiser. Feche quando se sentir melhor.</p>
      </div>
    </div>
  );
}
