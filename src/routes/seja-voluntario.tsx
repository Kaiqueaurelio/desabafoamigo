import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ChevronDown, Heart, GraduationCap, Clock } from "lucide-react";

export const Route = createFileRoute("/seja-voluntario")({
  component: SejaVoluntario,
  head: () => ({
    meta: [
      { title: "Seja voluntário(a) — Desabafo Amigo" },
      {
        name: "description",
        content:
          "Ajude a ouvir quem mais precisa. Cadastre-se como voluntário do Desabafo Amigo e receba treinamento antes de atender.",
      },
      { property: "og:title", content: "Seja voluntário(a) — Desabafo Amigo" },
      { property: "og:url", content: "https://desabaoamigo.lovable.app/seja-voluntario" },
    ],
    links: [{ rel: "canonical", href: "https://desabaoamigo.lovable.app/seja-voluntario" }],
  }),
});

const FAQS = [
  {
    q: "Preciso ter formação em psicologia?",
    a: "Não. Buscamos pessoas empáticas e disponíveis. Todo voluntário passa por triagem, treinamento em escuta ativa e recebe apoio contínuo de moderadores.",
  },
  {
    q: "Quanto tempo preciso doar?",
    a: "Você define. Sugerimos pelo menos 3 conversas por semana, mas você entra e sai da fila quando puder.",
  },
  {
    q: "Como funciona a aprovação?",
    a: "Você preenche o formulário, um administrador revisa manualmente sua inscrição e responde por e-mail. Só depois da aprovação e do treinamento você começa a atender.",
  },
  {
    q: "Vou saber quem estou atendendo?",
    a: "Não. Todos os usuários usam apelidos e avatares gerados pelo app. Isso protege quem procura ajuda — e você também.",
  },
  {
    q: "E se eu me sentir sobrecarregado(a)?",
    a: "Existe um botão de encerrar a qualquer momento e um canal direto com moderadores. Cuidar de você vem primeiro.",
  },
];

const DEPOIMENTOS = [
  {
    nome: "Voluntária desde 2024",
    texto: "Nunca imaginei o quanto ouvir alguém uma vez por semana mudaria também a minha vida.",
  },
  {
    nome: "Voluntário há 8 meses",
    texto:
      "É simples, é seguro e faz diferença de verdade. Recomendo a qualquer pessoa com um tempinho.",
  },
  {
    nome: "Voluntária há 1 ano",
    texto: "O treinamento me deu ferramentas que uso até fora do app, com família e amigos.",
  },
];

function SejaVoluntario() {
  return (
    <main id="conteudo" className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <Logo size={48} />
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Início
        </Link>
      </div>

      <h1 className="text-4xl font-bold text-primary">Ouvir também transforma quem ouve</h1>
      <p className="mt-4 max-w-2xl text-lg text-foreground/80">
        Uma hora do seu dia pode ser o motivo de alguém acordar melhor amanhã. Nosso time acolhe
        voluntários com empatia, disponibilidade e vontade de ajudar.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Bloco
          icon={<Heart className="size-5" />}
          title="Sem custo"
          desc="Você doa tempo. Nós doamos treinamento."
        />
        <Bloco
          icon={<GraduationCap className="size-5" />}
          title="Treinamento antes"
          desc="Escuta ativa, limites, protocolos de risco."
        />
        <Bloco
          icon={<Clock className="size-5" />}
          title="Flexível"
          desc="Você entra na fila quando pode. Sem escala rígida."
        />
      </div>

      <div className="mt-10 flex gap-3">
        <Link to="/pro/cadastro" className="btn-primary">
          Quero me cadastrar
        </Link>
        <Link
          to="/sobre"
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:border-primary/40"
        >
          Conhecer o projeto
        </Link>
      </div>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-foreground">O que dizem quem já ouve</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {DEPOIMENTOS.map((d) => (
            <blockquote key={d.nome} className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm italic text-foreground/80">"{d.texto}"</p>
              <footer className="mt-3 text-xs text-muted-foreground">— {d.nome}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-foreground">Perguntas frequentes</h2>
        <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
          {FAQS.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>
    </main>
  );
}

function Bloco({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 grid size-10 place-items-center rounded-xl bg-brand-soft text-primary">
        {icon}
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="w-full px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-expanded={open}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{q}</span>
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
      </div>
      {open && <p className="mt-2 text-sm text-muted-foreground">{a}</p>}
    </button>
  );
}
