import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { MessageSquareText, CalendarClock, FileText, Mic, HeartHandshake, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Desabafa Amigo — escuta acolhedora por mensagem" },
      { name: "description", content: "Converse com voluntários treinados em escuta ativa. Seu apelido é gerado pelo app, sua identidade fica protegida." },
      { property: "og:title", content: "Desabafa Amigo — escuta acolhedora por mensagem" },
      { property: "og:description", content: "Um espaço para desabafar com apoio voluntário, com apelido gerado pelo app." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="min-h-dvh bg-gradient-to-b from-brand-soft via-background to-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <span className="text-sm font-semibold text-primary">Desabafa Amigo</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/pro/cadastro" className="text-muted-foreground hover:text-primary">Ser voluntário(a)</Link>
          <Link to="/auth" className="btn-primary !py-2 !px-4 text-sm">Entrar</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-2 md:py-24">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-brand-green shadow-sm">
            <HeartHandshake className="size-3" /> Escuta acolhedora por mensagem
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-primary sm:text-5xl">
            Desabafe com quem sabe ouvir. Pelo <span className="text-brand-green">chat</span>, no seu tempo.
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Converse por mensagens com voluntários treinados em escuta ativa. Seu apelido é gerado pelo app — sua identidade fica protegida.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="btn-primary inline-flex items-center gap-2">
              <MessageSquareText className="size-5" /> Começar a conversar
            </Link>
            <Link to="/pro/cadastro" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-primary hover:bg-muted">
              <HeartHandshake className="size-4" /> Ser voluntário(a)
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Este é um espaço de escuta acolhedora com voluntários treinados. Não oferecemos atendimento psicológico, psiquiátrico ou médico, e não temos vínculo com esses profissionais.
          </p>
        </div>

        <div className="relative">
          <div className="rounded-3xl bg-card p-6 shadow-[var(--shadow-calm)]">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
              <div className="grid size-10 place-items-center rounded-full bg-brand-soft text-primary">
                <HeartHandshake className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sereno Rio 428</p>
                <p className="text-[11px] text-brand-green">Online agora · Voluntário(a) treinado(a)</p>
              </div>
            </div>
            <div className="space-y-2">
              <Bubble side="peer">Oi! Como você está se sentindo hoje?</Bubble>
              <Bubble side="me">Um pouco ansiosa com o trabalho. Queria conversar um pouco.</Bubble>
              <Bubble side="peer">Estou aqui pra te ouvir. Me conta com calma.</Bubble>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 md:grid-cols-4">
        <Feature icon={<Sparkles className="size-5" />} title="Apelido no app" text="O app cria seu apelido e avatar — sem expor seu nome." />
        <Feature icon={<CalendarClock className="size-5" />} title="Agendamento fácil" text="Reserve um horário com um(a) voluntário(a)." />
        <Feature icon={<MessageSquareText className="size-5" />} title="Chat no seu tempo" text="Converse sem pressa e sem videochamada." />
        <Feature icon={<Mic className="size-5" />} title="Texto, imagem, áudio" text="Escreva, grave um áudio ou envie uma foto." />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl bg-primary p-8 text-primary-foreground md:p-12">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">Pronto para começar?</h2>
              <p className="mt-2 max-w-md opacity-90">Cadastro rápido e gratuito. Você recebe um apelido do app e pode iniciar sua primeira conversa em minutos.</p>
            </div>
            <Link to="/auth" className="rounded-xl bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary hover:opacity-90">
              Criar conta
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>Em emergência, ligue 192 (SAMU) ou 188 (CVV). O Desabafa Amigo é um espaço de escuta voluntária — não substitui atendimento profissional de urgência.</p>
          <Link to="/admin/login" className="hover:text-primary">Admin</Link>
        </div>
      </footer>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 grid size-9 place-items-center rounded-lg bg-brand-soft text-primary">{icon}</div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Bubble({ side, children }: { side: "me" | "peer"; children?: React.ReactNode }) {
  const mine = side === "me";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-chat-user text-chat-user-foreground rounded-br-sm" : "bg-chat-peer text-chat-peer-foreground rounded-bl-sm"}`}>
        {children}
      </div>
    </div>
  );
}
