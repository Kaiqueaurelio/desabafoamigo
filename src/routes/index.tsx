import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { EmergencyButton } from "@/components/EmergencyButton";
import { ShieldCheck, Heart, MessageCircleHeart } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-gradient-to-b from-brand-soft via-background to-background">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-between px-6 py-10">
        <header className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={36} />
            <span className="text-sm font-semibold tracking-tight text-primary">
              Desabafa Amigo
            </span>
          </div>
          <Link
            to="/voluntario/login"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
          >
            Sou voluntário
          </Link>
        </header>

        <section className="flex flex-col items-center text-center">
          <Logo size={112} className="mb-6 drop-shadow-lg" />
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            Desabafa Amigo
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Você não precisa enfrentar tudo sozinho.
          </p>
          <Link
            to="/conversar"
            className="mt-8 btn-primary inline-flex items-center gap-2 text-base"
          >
            <MessageCircleHeart className="size-5" aria-hidden />
            Começar conversa
          </Link>
          <p className="mt-4 text-xs text-muted-foreground">
            Sem cadastro. Sem nome. Sem e-mail. Totalmente anônimo.
          </p>
        </section>

        <section className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Feature icon={<ShieldCheck className="size-5 text-brand-green" />} title="Anônimo">
            Um apelido temporário é gerado só para esta conversa.
          </Feature>
          <Feature icon={<Heart className="size-5 text-brand-green" />} title="Acolhedor">
            Voluntários e psicólogos prontos para escutar você.
          </Feature>
          <Feature icon={<MessageCircleHeart className="size-5 text-brand-green" />} title="Efêmero">
            Ao terminar, todo o histórico é apagado automaticamente.
          </Feature>
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p>
            Em caso de risco imediato, procure ajuda presencial ou ligue para o serviço de
            emergência local. O aplicativo não substitui atendimento profissional de urgência.
          </p>
          <p className="mt-3">
            <Link to="/admin/login" className="hover:text-primary">Admin</Link>
          </p>
        </footer>

      </div>
      <EmergencyButton />
    </main>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-left">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
