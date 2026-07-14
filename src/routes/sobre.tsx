import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Shield, Users } from "lucide-react";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/sobre")({
  component: SobrePage,
  head: () => ({
    meta: [
      { title: "Sobre — Desabafo Amigo" },
      {
        name: "description",
        content:
          "Conheça a história do Desabafo Amigo: um espaço nascido do desejo de ouvir sem julgamento e acolher quem precisa ser escutado.",
      },
      { property: "og:title", content: "Sobre — Desabafo Amigo" },
      {
        property: "og:description",
        content:
          "Um projeto voluntário nascido da escuta. Saiba como e por que criamos o Desabafo Amigo.",
      },
      { property: "og:url", content: "https://desabaoamigo.lovable.app/sobre" },
    ],
    links: [{ rel: "canonical", href: "https://desabaoamigo.lovable.app/sobre" }],
  }),
});

function SobrePage() {
  return (
    <main id="conteudo" className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <Logo size={48} />
        <Link to="/" className="text-sm text-primary hover:underline">← Início</Link>
      </div>

      <h1 className="text-4xl font-bold text-primary">Nossa história</h1>
      <p className="mt-4 text-lg leading-relaxed text-foreground/90">
        O Desabafo Amigo nasceu de uma inquietação simples: <strong>quantas pessoas ao nosso redor
        precisam ser ouvidas e não têm para quem ligar?</strong> Amigos que somem, famílias que julgam,
        terapias que nem todo mundo pode pagar. Ficava sempre aquela lacuna: a pessoa quer conversar,
        mas não quer expor o rosto, o nome, a vida inteira.
      </p>
      <p className="mt-4 leading-relaxed text-foreground/80">
        Começamos como um grupo pequeno de voluntários trocando mensagens com quem estava passando por
        um momento difícil. Cresceu no boca a boca. Percebemos que faltava uma coisa central:
        <strong> confiança</strong>. A pessoa precisa saber que pode desabafar sem virar screenshot em
        grupo de WhatsApp, sem ser reconhecida, sem ter sua história vazando por aí.
      </p>
      <p className="mt-4 leading-relaxed text-foreground/80">
        Por isso o app funciona do jeito que funciona: seu apelido é gerado por nós, seu avatar é
        aleatório, as mensagens somem depois que a conversa acaba, capturas de tela são bloqueadas
        dos dois lados, e todos os voluntários passam por triagem e treinamento antes de atender.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <Pilar icon={<Heart className="size-5" />} title="Escuta acolhedora" desc="Sem julgamento, sem pressa, sem receita pronta." />
        <Pilar icon={<Shield className="size-5" />} title="Privacidade radical" desc="Identidade protegida, mensagens efêmeras, print bloqueado." />
        <Pilar icon={<Users className="size-5" />} title="Voluntariado sério" desc="Todo voluntário é aprovado e treinado antes de atender." />
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-foreground">O que nós NÃO somos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Não somos serviço de psicologia, psiquiatria ou medicina. Não substituímos terapia nem
          atendimento clínico. Em situações de risco à vida, oriente-se ao <strong>CVV 188</strong>
          (24h, gratuito) ou ao SAMU 192.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/conversar" className="btn-primary">Preciso conversar</Link>
        <Link to="/seja-voluntario" className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:border-primary/40">
          Quero ser voluntário(a)
        </Link>
      </div>
    </main>
  );
}

function Pilar({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 grid size-10 place-items-center rounded-xl bg-brand-soft text-primary">{icon}</div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
