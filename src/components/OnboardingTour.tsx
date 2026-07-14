import { useEffect, useRef, useState } from "react";
import { Heart, Shield, MessagesSquare, Sparkles, X } from "lucide-react";
import { useFocusTrap } from "@/lib/useFocusTrap";

const KEY = "desabafo:onboarded";

const STEPS = [
  { icon: Heart, title: "Bem-vindo(a) ao Desabafa Amigo", body: "Um espaço acolhedor para você conversar por mensagem com voluntários treinados em escuta." },
  { icon: Shield, title: "Sua identidade fica protegida", body: "Geramos um apelido e um avatar para você. Ninguém precisa saber quem é a pessoa por trás." },
  { icon: MessagesSquare, title: "Comece quando quiser", body: "Toque em 'Conversar agora' para entrar na fila. Se preferir, use nosso assistente de triagem." },
  { icon: Sparkles, title: "Você também tem apoio próprio", body: "Diário emocional, exercícios de respiração e biblioteca de apoio estão em Início." },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setOpen(true);
  }, []);

  function finish() {
    try { localStorage.setItem(KEY, "1"); } catch { /* noop */ }
    setOpen(false);
  }

  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef, { onEscape: finish });

  if (!open) return null;
  const S = STEPS[step];
  const Icon = S.icon;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tour-title"
      className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4">
      <div ref={panelRef} className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-primary">
            <Icon className="size-6" aria-hidden />
          </div>
          <button onClick={finish} aria-label="Fechar" className="rounded-full p-1 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <h2 id="tour-title" className="text-lg font-semibold text-foreground">{S.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{S.body}</p>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={finish} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">Pular</button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="btn-primary text-sm">Próximo</button>
            ) : (
              <button onClick={finish} className="btn-primary text-sm">Começar</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
