import { useState } from "react";
import { LifeBuoy, Phone, X } from "lucide-react";

export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Preciso de ajuda urgente"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground shadow-lg transition hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-destructive/40"
      >
        <LifeBuoy className="size-5" aria-hidden />
        <span>Preciso de ajuda urgente</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergencia-titulo"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="emergencia-titulo" className="text-xl font-semibold text-foreground">
                Você não está sozinho
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Se você está em risco imediato, procure ajuda presencial ou ligue para um dos
              serviços oficiais de emergência abaixo. Este aplicativo é um espaço de escuta voluntária
              e não substitui atendimento profissional de urgência.
            </p>
            <ul className="space-y-2">
              <EmergencyLink label="CVV — Centro de Valorização da Vida" number="188" />
              <EmergencyLink label="SAMU — Emergência médica" number="192" />
              <EmergencyLink label="Bombeiros" number="193" />
              <EmergencyLink label="Polícia Militar" number="190" />
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Fora do Brasil? Procure o serviço de prevenção ao suicídio ou emergência local do seu país.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function EmergencyLink({ label, number }: { label: string; number: string }) {
  return (
    <li>
      <a
        href={`tel:${number}`}
        className="flex items-center justify-between rounded-lg border border-border bg-brand-soft px-4 py-3 text-foreground transition hover:border-primary hover:bg-secondary"
      >
        <span className="text-sm font-medium">{label}</span>
        <span className="flex items-center gap-2 font-mono text-base font-semibold text-primary">
          <Phone className="size-4" aria-hidden /> {number}
        </span>
      </a>
    </li>
  );
}
