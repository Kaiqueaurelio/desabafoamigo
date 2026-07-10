import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import {
  MessageSquareText,
  CalendarClock,
  HeartHandshake,
  Sparkles,
  Shield,
  Ear,
  Users,
  Quote,
  ArrowRight,
  Lock,
  Clock,
  Mic,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { avatarUrl } from "@/lib/avatar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Desabafa Amigo — sua voz merece ser ouvida" },
      {
        name: "description",
        content:
          "Um espaço confiável para conversar por mensagem com voluntários treinados em escuta acolhedora. Seu apelido é gerado pelo app — sua identidade fica protegida.",
      },
      { property: "og:title", content: "Desabafa Amigo — sua voz merece ser ouvida" },
      {
        property: "og:description",
        content:
          "Nasceu do desejo de ajudar pessoas e criar um lugar seguro para desabafar. Voluntários treinados, chat protegido, apelido gerado pelo app.",
      },
    ],
  }),
  component: Landing,
});

/** Subtle reveal-on-scroll hook — respects prefers-reduced-motion. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-dvh overflow-hidden bg-background text-base leading-relaxed">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <Header />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <Origin />
        <Mission />
        <Testimonials />
        <HowTo />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" aria-label="Desabafa Amigo — página inicial" className="flex items-center gap-2 rounded-md">
          <Logo size={32} />
          <span className="text-sm font-semibold text-primary">Desabafa Amigo</span>
        </Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-6 text-sm text-foreground/80 md:flex">
          <a href="#origem" className="rounded-md hover:text-primary transition-colors">Nossa história</a>
          <a href="#missao" className="rounded-md hover:text-primary transition-colors">Como ajudamos</a>
          <a href="#depoimentos" className="rounded-md hover:text-primary transition-colors">Depoimentos</a>
          <Link to="/pro/cadastro" className="rounded-md hover:text-primary transition-colors">Ser voluntário(a)</Link>
        </nav>
        <Link to="/auth" className="btn-primary !py-2 !px-4 text-sm">Entrar</Link>
      </div>
    </header>
  );
}


function Hero() {
  return (
    <section className="relative isolate">
      {/* animated soft background */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-20 size-[520px] rounded-full bg-brand-sky/20 blur-3xl animate-blob" />
        <div className="absolute top-20 -right-20 size-[520px] rounded-full bg-brand-green/15 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-soft/60 via-background to-background" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="flex flex-col justify-center animate-fade-in">
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-brand-green shadow-sm backdrop-blur">
            <HeartHandshake className="size-3.5" /> Escuta acolhedora por mensagem
          </span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-primary sm:text-5xl md:text-6xl">
            Sua voz merece <span className="text-brand-green">ser ouvida</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Um espaço confiável para desabafar por mensagem, com voluntários treinados em escuta
            ativa. Sem julgamento, sem exposição — seu apelido é gerado pelo app.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="btn-primary inline-flex items-center gap-2 group">
              <MessageSquareText className="size-5" />
              Começar a conversar
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#origem"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-primary transition hover:bg-muted"
            >
              Nossa história
            </a>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
            {[
              { k: "100%", v: "Anônimo" },
              { k: "24/7", v: "Disponível" },
              { k: "0R$", v: "Sempre gratuito" },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl border border-border/60 bg-card/60 p-3 backdrop-blur">
                <dt className="text-xl font-bold text-primary">{s.k}</dt>
                <dd className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Chat mockup */}
        <div className="relative animate-fade-in">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-sky/30 to-brand-green/20 blur-2xl" />
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-calm)] animate-float">
            <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
              <img
                src={avatarUrl("Sereno Rio 428", 96)}
                alt=""
                className="size-11 rounded-full ring-2 ring-brand-soft"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">Sereno Rio 428</p>
                <p className="flex items-center gap-1.5 text-[11px] text-brand-green">
                  <span className="inline-block size-1.5 rounded-full bg-brand-green animate-pulse" />
                  Online agora · Voluntário(a) treinado(a)
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Bubble side="peer" delay={100}>Oi! Como você está se sentindo hoje?</Bubble>
              <Bubble side="me" delay={400}>Um pouco ansiosa com o trabalho. Queria conversar um pouco.</Bubble>
              <Bubble side="peer" delay={800}>Estou aqui pra te ouvir. Me conta com calma. 💙</Bubble>
              <div className="flex items-center gap-1 pt-1 pl-2 text-xs text-muted-foreground">
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:120ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:240ms]" />
                <span className="ml-1">digitando…</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Origin() {
  return (
    <section id="origem" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-green">
            Nossa origem
          </span>
          <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
            A semente da mudança
          </h2>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-10 md:grid-cols-2 md:items-center">
        <Reveal>
          <div className="space-y-5 text-[15px] leading-relaxed text-muted-foreground">
            <p>
              O <strong className="text-foreground">Desabafa Amigo</strong> nasceu de uma
              observação simples e ao mesmo tempo urgente: <strong className="text-foreground">muita gente
              só precisa ser ouvida</strong>. Não com pressa, não com conselhos apressados —
              apenas com presença.
            </p>
            <p>
              Vimos pessoas próximas engolindo o cansaço, a ansiedade e a tristeza porque
              não sabiam onde falar sem medo de julgamento, sem se expor e sem pagar por
              isso. Ligações caras, filas de espera longas, formulários que assustam.
            </p>
            <p>
              Foi daí que veio a vontade de construir <strong className="text-foreground">um lugar simples,
              seguro e humano</strong>: um chat onde a sua identidade fica protegida por um
              apelido gerado pelo app, e do outro lado tem sempre alguém treinado em
              escuta acolhedora, pronto para te ouvir com calma.
            </p>
            <p className="text-foreground">
              É um projeto feito por gente que já precisou desabafar — para gente que
              precisa desabafar.
            </p>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="grid gap-3 sm:grid-cols-2">
            <OriginCard
              icon={<Ear className="size-5" />}
              title="Escuta sem pressa"
              text="Sem cronômetro, sem roteiro. Conversa no seu tempo."
            />
            <OriginCard
              icon={<Shield className="size-5" />}
              title="Identidade protegida"
              text="Você recebe um apelido e avatar gerados pelo app."
            />
            <OriginCard
              icon={<Users className="size-5" />}
              title="Voluntários treinados"
              text="Pessoas capacitadas em acolhimento, verificadas pela equipe."
            />
            <OriginCard
              icon={<HeartHandshake className="size-5" />}
              title="Sempre gratuito"
              text="Nasceu para ajudar. Nunca vai custar nada para desabafar."
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function OriginCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-calm)]">
      <div className="mb-3 grid size-10 place-items-center rounded-xl bg-brand-soft text-primary transition-transform group-hover:scale-110">
        {icon}
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Mission() {
  const items = [
    {
      icon: <Sparkles className="size-5" />,
      title: "Apelido no app",
      text: "Você recebe um apelido e avatar únicos, gerados automaticamente para preservar sua identidade.",
    },
    {
      icon: <MessageSquareText className="size-5" />,
      title: "Chat no seu tempo",
      text: "Escreva quando puder. Sem videochamada, sem constrangimento, sem pressa.",
    },
    {
      icon: <CalendarClock className="size-5" />,
      title: "Agendamento fácil",
      text: "Reserve um horário com um(a) voluntário(a) disponível quando fizer sentido para você.",
    },
    {
      icon: <Mic className="size-5" />,
      title: "Texto, imagem e áudio",
      text: "Se preferir gravar um áudio ou enviar uma foto, o app suporta com segurança.",
    },
    {
      icon: <Lock className="size-5" />,
      title: "Seguro por padrão",
      text: "Conversas protegidas por criptografia em trânsito e políticas rigorosas de acesso.",
    },
    {
      icon: <Clock className="size-5" />,
      title: "24 horas por dia",
      text: "Voluntários se revezam para que você encontre acolhimento sempre que precisar.",
    },
  ];
  return (
    <section id="missao" className="bg-brand-soft/40 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-green">
              Nossa missão
            </span>
            <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
              Unindo vozes, criando acolhimento
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tudo o que construímos existe para tornar o desabafo mais leve, mais
              seguro e mais humano.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-calm)]">
                <div className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-soft text-primary">
                  {it.icon}
                </div>
                <p className="text-lg font-semibold text-foreground">{it.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    {
      name: "Lua Serena 214",
      role: "Amiga acolhida",
      text: "Consegui falar de coisas que nunca tinha falado com ninguém. Ser ouvida sem julgamento mudou meu dia.",
    },
    {
      name: "Nuvem Azul 087",
      role: "Amigo acolhido",
      text: "Estava num momento pesado e o app me ajudou a respirar. O apelido me deu coragem pra ser sincero.",
    },
    {
      name: "Sol Manso 512",
      role: "Voluntária treinada",
      text: "É lindo poder oferecer um pouco do meu tempo pra ouvir alguém. Todo mundo merece ser escutado.",
    },
  ];
  return (
    <section id="depoimentos" className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-green">
            O poder da sua voz
          </span>
          <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
            Histórias de quem já foi ouvido
          </h2>
          <p className="mt-4 text-muted-foreground">
            Nomes preservados por apelidos gerados pelo app — as histórias são reais.
          </p>
        </div>
      </Reveal>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {items.map((t, i) => (
          <Reveal key={t.name} delay={i * 120}>
            <figure className="h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-calm)]">
              <Quote className="size-6 text-brand-sky" />
              <blockquote className="mt-3 text-[15px] leading-relaxed text-foreground">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <img src={avatarUrl(t.name, 80)} alt="" className="size-10 rounded-full ring-2 ring-brand-soft" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function HowTo() {
  const steps = [
    { n: "01", title: "Crie sua conta", text: "É rápido. Só precisamos de um e-mail — nada de nome real." },
    { n: "02", title: "Receba seu apelido", text: "O app gera automaticamente um apelido e avatar únicos pra você." },
    { n: "03", title: "Comece a conversar", text: "Escolha um(a) voluntário(a) disponível e desabafe no seu tempo." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
      <Reveal>
        <div className="rounded-3xl bg-primary p-8 text-primary-foreground shadow-[var(--shadow-calm)] md:p-12">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
                Comece sua jornada
              </span>
              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                Faça parte desta comunidade
              </h2>
              <p className="mt-4 max-w-md text-primary-foreground/80">
                Três passos simples separam você de uma conversa acolhedora. Sem
                burocracia, sem exposição.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary transition hover:opacity-90"
                >
                  Cadastre-se gratuitamente
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/pro/cadastro"
                  className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
                >
                  Quero ser voluntário(a)
                </Link>
              </div>
            </div>

            <ol className="space-y-3">
              {steps.map((s, i) => (
                <Reveal key={s.n} delay={i * 120}>
                  <li className="flex gap-4 rounded-2xl bg-primary-foreground/10 p-4 backdrop-blur">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-foreground/20 text-sm font-bold">
                      {s.n}
                    </span>
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-sm text-primary-foreground/80">{s.text}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-semibold text-primary">Desabafa Amigo</span>
          </div>
          <p className="mt-3 max-w-xs text-xs text-muted-foreground">
            Um espaço de escuta acolhedora com voluntários treinados. Não oferecemos
            atendimento psicológico, psiquiátrico ou médico, e não temos vínculo com
            esses profissionais.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-foreground">Navegar</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#origem" className="hover:text-primary">Nossa história</a></li>
            <li><a href="#missao" className="hover:text-primary">Como ajudamos</a></li>
            <li><a href="#depoimentos" className="hover:text-primary">Depoimentos</a></li>
            <li><Link to="/pro/cadastro" className="hover:text-primary">Ser voluntário(a)</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-semibold text-foreground">Em emergência</p>
          <ul className="space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">CVV:</strong> 188 (24h, gratuito)</li>
            <li><strong className="text-foreground">SAMU:</strong> 192</li>
            <li><strong className="text-foreground">Polícia:</strong> 190</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            O Desabafa Amigo não substitui atendimento de urgência.
          </p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-4 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Desabafa Amigo. Feito com cuidado.</p>
          <Link to="/admin/login" className="hover:text-primary">Admin</Link>
        </div>
      </div>
    </footer>
  );
}

function Bubble({
  side,
  delay = 0,
  children,
}: {
  side: "me" | "peer";
  delay?: number;
  children?: React.ReactNode;
}) {
  const mine = side === "me";
  return (
    <div
      className={`flex ${mine ? "justify-end" : "justify-start"} animate-fade-in`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
          mine
            ? "bg-chat-user text-chat-user-foreground rounded-br-sm"
            : "bg-chat-peer text-chat-peer-foreground rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
