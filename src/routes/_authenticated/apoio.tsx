import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Wind, HeartPulse, Sun, Users, PhoneCall } from "lucide-react";
import { BreathingButton } from "@/components/BreathingExercise";

export const Route = createFileRoute("/_authenticated/apoio")({
  component: Apoio,
});

const TIPS = [
  { icon: Wind, title: "Respiração 4-7-8", body: "Inspire por 4s, segure por 7s, solte por 8s. Repita 4 ciclos. Reduz ansiedade rapidamente." },
  { icon: HeartPulse, title: "Grounding 5-4-3-2-1", body: "Nomeie 5 coisas que vê, 4 que toca, 3 que ouve, 2 que cheira e 1 que sente. Traz você para o presente." },
  { icon: Sun, title: "Rotina de autocuidado", body: "Beba água, respire ar fresco, movimente-se por 10 minutos. Corpo cuidado, mente mais leve." },
  { icon: Users, title: "Rede de apoio", body: "Fale com alguém de confiança. Pedir ajuda é força, não fraqueza." },
];

const CONTACTS = [
  { name: "CVV — Centro de Valorização da Vida", phone: "188", link: "https://www.cvv.org.br/", desc: "24h, gratuito e sigiloso." },
  { name: "SAMU", phone: "192", desc: "Emergências médicas." },
  { name: "Polícia Militar", phone: "190", desc: "Emergências gerais." },
  { name: "Disque 100", phone: "100", desc: "Direitos humanos e violência." },
];

function Apoio() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-primary"><BookOpen className="size-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Biblioteca de apoio</h1>
          <p className="text-sm text-muted-foreground">Técnicas simples que ajudam a atravessar momentos difíceis.</p>
        </div>
      </div>

      <div className="mt-6"><BreathingButton /></div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Técnicas de acolhimento</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map((t) => (
            <article key={t.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 grid size-10 place-items-center rounded-xl bg-brand-soft text-primary"><t.icon className="size-5" /></div>
              <h3 className="font-semibold text-foreground">{t.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Se você precisa de ajuda urgente</h2>
        <div className="space-y-2">
          {CONTACTS.map((c) => (
            <div key={c.name} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </div>
              <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <PhoneCall className="size-4" /> {c.phone}
              </a>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 rounded-2xl bg-brand-soft p-4 text-xs text-muted-foreground">
        Os conteúdos desta página são de caráter informativo e não substituem atendimento profissional de saúde.
      </p>
    </div>
  );
}
