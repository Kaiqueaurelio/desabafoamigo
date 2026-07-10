import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";

export const Route = createFileRoute("/emergencia")({
  head: () => ({
    meta: [
      { title: "Ajuda urgente — Desabafa Amigo" },
      { name: "description", content: "Contatos oficiais de emergência e prevenção ao suicídio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Emergency,
});

const contacts = [
  { label: "CVV — Centro de Valorização da Vida (24h)", number: "188" },
  { label: "SAMU — Emergência médica", number: "192" },
  { label: "Bombeiros", number: "193" },
  { label: "Polícia Militar", number: "190" },
];

function Emergency() {
  return (
    <main className="min-h-dvh bg-background px-6 py-10">
      <div className="mx-auto max-w-md">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Voltar</Link>
        <h1 className="mt-4 text-2xl font-bold text-primary">Preciso de ajuda urgente</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Se você está em risco imediato, procure ajuda presencial ou ligue para um dos serviços
          oficiais abaixo. Este aplicativo não substitui atendimento médico ou psicológico de urgência.
        </p>
        <ul className="mt-6 space-y-3">
          {contacts.map((c) => (
            <li key={c.number}>
              <a
                href={`tel:${c.number}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-4 shadow-sm transition hover:border-primary"
              >
                <span className="font-medium text-foreground">{c.label}</span>
                <span className="flex items-center gap-2 font-mono text-lg font-bold text-primary">
                  <Phone className="size-4" aria-hidden /> {c.number}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">
          Fora do Brasil, procure o serviço de prevenção ao suicídio ou emergência local do seu país.
        </p>
      </div>
    </main>
  );
}
