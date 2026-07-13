import { useEffect, useState } from "react";
import { HeartPulse, X } from "lucide-react";
import { dismissPauseSuggestion, getSessionCount } from "@/lib/volunteerWellbeing";

/**
 * Card visível apenas quando o voluntário atendeu N conversas seguidas.
 * O gatilho é setado por quem chama `registerConversationStart()`.
 */
export function WellbeingCard({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (visible) setCount(getSessionCount());
  }, [visible]);

  if (!visible) return null;

  function close() {
    dismissPauseSuggestion();
    onClose();
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/30 bg-brand-soft/60 p-4 animate-fade-in"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <HeartPulse className="size-5" aria-hidden />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-foreground">Você já atendeu {count} conversas hoje 💛</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Que tal uma pausa de 5 minutos? Beba água, respire, alongue os ombros. Escutar bem também é
          cuidar de quem escuta.
        </p>
      </div>
      <button
        onClick={close}
        aria-label="Dispensar sugestão de pausa"
        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
