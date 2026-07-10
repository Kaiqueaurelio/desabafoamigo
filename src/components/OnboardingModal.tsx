import { useEffect, useState } from "react";
import { HeartHandshake, Shield, MessageCircleHeart, ArrowRight, X } from "lucide-react";

const KEY = "desabafa_onboarding_v1";
const STEPS = [
  { icon: HeartHandshake, title: "Bem-vindo(a) ao Desabafa Amigo", body: "Um espaço seguro onde você pode desabafar e ser ouvido(a) por voluntários(as) treinados(as). Sem julgamentos, no seu tempo." },
  { icon: Shield, title: "Sua identidade é protegida", body: "Nós geramos automaticamente um apelido e um avatar para você. Ninguém sabe quem você é fora da conversa." },
  { icon: MessageCircleHeart, title: "Você não está sozinho(a)", body: "Se estiver em crise, use o botão de emergência (💙 canto da tela) para acessar o CVV (188) a qualquer momento." },
] as const;

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(KEY)) setOpen(true);
  }, []);

  function close() {
    localStorage.setItem(KEY, "1");
    setOpen(false);
  }

  if (!open) return null;
  const S = STEPS[step];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-md rounded-3xl bg-card p-8 shadow-2xl">
        <button onClick={close} aria-label="Pular" className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-primary">
          <S.icon className="size-7" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">{S.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{S.body}</p>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="btn-primary inline-flex items-center gap-1 text-sm">
              Próximo <ArrowRight className="size-4" />
            </button>
          ) : (
            <button onClick={close} className="btn-primary text-sm">Começar</button>
          )}
        </div>
      </div>
    </div>
  );
}
