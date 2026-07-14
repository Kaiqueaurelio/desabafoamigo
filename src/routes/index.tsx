import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { ChatDemo } from "@/components/ChatDemo";
import { InfinityFlow } from "@/components/Watermark";
import { ScrollProgress, SpotlightBinder, WordReveal } from "@/components/LandingFX";
import { MotionStagger, MotionItem, MagneticWrap, Parallax, MarqueeRow, useSmoothAnchors } from "@/components/LandingMotion";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
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
  Infinity as InfinityIcon,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Wind,
  Compass,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { avatarUrl } from "@/lib/avatar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Desabafo Amigo — sua voz merece ser ouvida" },
      {
        name: "description",
        content:
          "Um espaço confiável para conversar por mensagem com voluntários treinados em escuta acolhedora. Seu apelido é gerado pelo app — sua identidade fica protegida.",
      },
      { property: "og:title", content: "Desabafo Amigo — sua voz merece ser ouvida" },
      {
        property: "og:description",
        content:
          "Um espaço confiável para conversar por mensagem com voluntários treinados em escuta acolhedora. Seu apelido é gerado pelo app — sua identidade fica protegida.",
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

/** Counter que anima de 0 até `target` quando entra em vista. */
function CountUp({ target, suffix = "", duration = 1400 }: { target: number; suffix?: string; duration?: number }) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(target); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, target, duration]);
  return <span ref={ref}>{n.toLocaleString("pt-BR")}{suffix}</span>;
}

function Landing() {
  useSmoothAnchors();
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-base leading-relaxed">
      <ScrollProgress />
      <SpotlightBinder />
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <div className="relative z-10">
        <Header />
        <main id="conteudo" tabIndex={-1}>
          <Hero />
          <InfinityBand />
          <Impact />
          <Origin />
          <InfinityBand reverse />
          <Mission />
          <Journey />
          <Voices />
          <Testimonials />
          <FAQ />
          <HowTo />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function InfinityBand({ reverse = false }: { reverse?: boolean }) {
  const words = [
    "Escuta sem fim",
    "∞",
    "Acolhimento contínuo",
    "∞",
    "Sua voz importa",
    "∞",
    "24 horas por dia",
    "∞",
    "Você não está sozinho(a)",
    "∞",
  ];
  const loop = [...words, ...words, ...words];
  return (
    <section aria-hidden className="relative border-y border-border/50 bg-brand-soft/40 py-6 overflow-hidden">
      <div className={`flex whitespace-nowrap ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`}>
        {loop.map((w, i) => (
          <span key={i} className="mx-6 text-sm font-semibold uppercase tracking-widest text-primary/70">
            {w}
          </span>
        ))}
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" aria-label="Desabafo Amigo — página inicial" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <Logo responsive priority decorative className="h-12 w-12 drop-shadow-sm sm:h-14 sm:w-14 md:h-14 md:w-14 lg:h-16 lg:w-16" />
          <span className="text-base font-semibold text-primary md:text-lg">Desabafo Amigo</span>
        </Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-6 text-sm text-foreground/80 md:flex">
          <a href="#origem" className="rounded-md hover:text-primary transition-colors">Nossa história</a>
          <a href="#missao" className="rounded-md hover:text-primary transition-colors">Como ajudamos</a>
          <a href="#jornada" className="rounded-md hover:text-primary transition-colors">Sua jornada</a>
          <a href="#depoimentos" className="rounded-md hover:text-primary transition-colors">Depoimentos</a>
          <a href="#faq" className="rounded-md hover:text-primary transition-colors">Dúvidas</a>
          <Link to="/pro/cadastro" className="rounded-md hover:text-primary transition-colors">Ser voluntário(a)</Link>
        </nav>
        <Link to="/auth" className="btn-primary !py-2 !px-4 text-sm">Entrar</Link>
      </div>
    </header>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const orb1Y = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 120]);
  const orb2Y = useTransform(scrollY, [0, 600], [0, reduce ? 0 : -120]);
  const heroScale = useTransform(scrollY, [0, 400], [1, reduce ? 1 : 0.96]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, reduce ? 1 : 0.6]);

  return (
    <section className="relative isolate">
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div style={{ y: orb1Y }} className="absolute -top-40 -left-20 size-[520px] rounded-full bg-brand-sky/20 blur-3xl animate-blob" />
        <motion.div style={{ y: orb2Y }} className="absolute top-20 -right-20 size-[520px] rounded-full bg-brand-green/15 blur-3xl animate-blob animation-delay-2000" />
        <InfinityFlow className="absolute inset-x-0 top-10 h-[420px] w-full opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-soft/60 via-background/70 to-background" />
      </div>

      <motion.div style={{ scale: heroScale, opacity: heroOpacity }} className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
        <div className="flex flex-col justify-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-brand-green shadow-sm backdrop-blur"
          >
            <InfinityIcon className="size-3.5 animate-spin-slow" /> Escuta acolhedora sem fim
          </motion.span>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-primary sm:text-5xl md:text-6xl">
            <WordReveal text="Sua voz merece" />{" "}
            <span className="bg-gradient-to-r from-brand-green via-brand-sky to-brand-green bg-clip-text text-transparent animate-gradient-shift" style={{ backgroundSize: "200% auto" }}>
              <WordReveal text="ser ouvida" delay={280} />
            </span>
            .
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground"
          >
            Um espaço confiável para desabafar por mensagem, com voluntários treinados em escuta
            ativa. Sem julgamento, sem exposição — seu apelido é gerado pelo app.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <MagneticWrap>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                <Link to="/auth" className="btn-primary btn-shine inline-flex items-center gap-2 group">
                  <MessageSquareText className="size-5" />
                  Começar a conversar
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.div>
            </MagneticWrap>
            <a
              href="#origem"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium text-primary transition hover:bg-muted hover:-translate-y-0.5"
            >
              Nossa história
            </a>
          </motion.div>

          <MotionStagger className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
            {[
              { k: "100%", v: "Anônimo" },
              { k: "24/7", v: "Disponível" },
              { k: "0R$", v: "Sempre gratuito" },
            ].map((s) => (
              <MotionItem key={s.v} className="rounded-2xl border border-border/60 bg-card/60 p-3 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-calm)]">
                <dt className="text-xl font-bold text-primary">{s.k}</dt>
                <dd className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.v}</dd>
              </MotionItem>
            ))}
          </MotionStagger>
        </div>

        <Parallax offset={40}>
          <motion.div
            initial={{ opacity: 0, y: 24, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 0.9, 0.28, 1] }}
            whileHover={{ rotateY: 2, rotateX: -2, scale: 1.01 }}
            style={{ transformPerspective: 1000 }}
          >
            <ChatDemo />
          </motion.div>
        </Parallax>
      </motion.div>
    </section>
  );
}



function Impact() {
  const stats = [
    { n: 1284, s: "+", label: "Conversas acolhidas" },
    { n: 320, s: "+", label: "Voluntários treinados" },
    { n: 97, s: "%", label: "Se sentiram ouvidos" },
    { n: 24, s: "/7", label: "Sempre disponível" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <Reveal>
        <div className="grid gap-4 rounded-3xl border border-border bg-card/60 p-6 backdrop-blur sm:grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <p className="bg-gradient-to-br from-brand-green to-brand-sky bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
                <CountUp target={s.n} suffix={s.s} />
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </Reveal>
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
              O <strong className="text-foreground">Desabafo Amigo</strong> nasceu de uma
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

        <MotionStagger className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: <Ear className="size-5" />, title: "Escuta sem pressa", text: "Sem cronômetro, sem roteiro. Conversa no seu tempo." },
            { icon: <Shield className="size-5" />, title: "Identidade protegida", text: "Você recebe um apelido e avatar gerados pelo app." },
            { icon: <Users className="size-5" />, title: "Voluntários treinados", text: "Pessoas capacitadas em acolhimento, verificadas pela equipe." },
            { icon: <HeartHandshake className="size-5" />, title: "Sempre gratuito", text: "Nasceu para ajudar. Nunca vai custar nada para desabafar." },
          ].map((c) => (
            <MotionItem key={c.title}>
              <OriginCard icon={c.icon} title={c.title} text={c.text} />
            </MotionItem>
          ))}
        </MotionStagger>

      </div>
    </section>
  );
}

function OriginCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="group spotlight-card rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-calm)]">
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
    { icon: <Sparkles className="size-5" />, title: "Apelido no app", text: "Você recebe um apelido e avatar únicos, gerados automaticamente para preservar sua identidade." },
    { icon: <MessageSquareText className="size-5" />, title: "Chat no seu tempo", text: "Escreva quando puder. Sem videochamada, sem constrangimento, sem pressa." },
    { icon: <CalendarClock className="size-5" />, title: "Agendamento fácil", text: "Reserve um horário com um(a) voluntário(a) disponível quando fizer sentido para você." },
    { icon: <Mic className="size-5" />, title: "Texto, imagem e áudio", text: "Se preferir gravar um áudio ou enviar uma foto, o app suporta com segurança." },
    { icon: <Lock className="size-5" />, title: "Seguro por padrão", text: "Conversas protegidas por criptografia em trânsito e políticas rigorosas de acesso." },
    { icon: <Clock className="size-5" />, title: "24 horas por dia", text: "Voluntários se revezam para que você encontre acolhimento sempre que precisar." },
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

        <MotionStagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
          {items.map((it) => (
            <MotionItem key={it.title} className="h-full spotlight-card rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-calm)]">
              <motion.div
                whileHover={{ scale: 1.12, rotate: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 14 }}
                className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-soft text-primary"
              >
                {it.icon}
              </motion.div>
              <p className="text-lg font-semibold text-foreground">{it.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.text}</p>
            </MotionItem>
          ))}
        </MotionStagger>
      </div>
    </section>
  );
}

function Journey() {
  const steps = [
    { icon: <Compass className="size-5" />, title: "Chegada", text: "Você entra e recebe um apelido único. Ninguém sabe quem você é fora daqui." },
    { icon: <MessageSquareText className="size-5" />, title: "Primeiro fôlego", text: "Escolha um horário ou entre na fila. Um(a) voluntário(a) treinado(a) te recebe." },
    { icon: <Ear className="size-5" />, title: "Ser ouvido(a)", text: "Fale no seu tempo. Sem roteiro, sem julgamento, sem apressamento." },
    { icon: <Wind className="size-5" />, title: "Ferramentas de calma", text: "Exercícios de respiração, biblioteca de apoio e diário emocional pra você usar quando quiser." },
    { icon: <BookOpen className="size-5" />, title: "Continuidade", text: "Volte sempre. Seu apelido continua o mesmo — se preferir, começa outro apelido do zero." },
  ];
  return (
    <section id="jornada" className="relative py-20 md:py-28">
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <InfinityFlow className="absolute inset-x-0 top-0 h-full w-full opacity-40" />
      </div>
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-green">
              Sua jornada aqui
            </span>
            <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">
              Uma linha contínua de acolhimento
            </h2>
          </div>
        </Reveal>

        <ol className="relative mt-14 space-y-6 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-brand-green/40 before:via-brand-sky/40 before:to-transparent md:before:left-1/2">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 90}>
              <li className={`relative grid gap-4 md:grid-cols-2 md:gap-10 ${i % 2 ? "md:[&>div:first-child]:col-start-2" : ""}`}>
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-primary">{s.icon}</span>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-green">Passo {i + 1}</p>
                  </div>
                  <p className="font-semibold text-foreground">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </div>
                <div aria-hidden className="hidden md:block" />
                <span aria-hidden className="absolute left-4 top-6 grid size-4 place-items-center rounded-full bg-primary ring-4 ring-background md:left-[calc(50%-8px)]" />
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Voices() {
  const phrases = [
    "Você não precisa ter tudo resolvido pra falar.",
    "Falar já é um começo.",
    "Você merece um espaço só seu.",
    "Chorar aqui também é bem-vindo.",
    "Silêncios não incomodam.",
    "Uma respiração de cada vez.",
    "O seu ritmo é o ritmo certo.",
    "Ninguém te julga aqui.",
  ];
  const loop = [...phrases, ...phrases];
  return (
    <section aria-hidden className="relative overflow-hidden bg-primary py-10 text-primary-foreground">
      <div className="animate-marquee-slow flex whitespace-nowrap">
        {loop.map((p, i) => (
          <span key={i} className="mx-8 text-lg font-medium md:text-2xl">
            {p} <span className="mx-4 opacity-40">∞</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { name: "Lua Serena 214", role: "Amiga acolhida", text: "Consegui falar de coisas que nunca tinha falado com ninguém. Ser ouvida sem julgamento mudou meu dia." },
    { name: "Nuvem Azul 087", role: "Amigo acolhido", text: "Estava num momento pesado e o app me ajudou a respirar. O apelido me deu coragem pra ser sincero." },
    { name: "Sol Manso 512", role: "Voluntária treinada", text: "É lindo poder oferecer um pouco do meu tempo pra ouvir alguém. Todo mundo merece ser escutado." },
    { name: "Rio Calmo 331", role: "Amigo acolhido", text: "Nunca me imaginei conversando com um estranho, mas o clima aqui é diferente. Me senti seguro." },
    { name: "Aurora Doce 706", role: "Voluntária treinada", text: "Adoro saber que existe um lugar assim. Cada conversa muda um pouco a gente também." },
    { name: "Prado Livre 158", role: "Amiga acolhida", text: "A respiração guiada me salvou de uma crise à noite. Obrigada por existir." },
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

      <div className="mt-14 space-y-5 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
        {[items.slice(0, 3), items.slice(3)].map((row, ri) => (
          <MarqueeRow key={ri} duration={ri === 0 ? 50 : 60} reverse={ri === 1}>
            {row.map((t) => (
              <figure
                key={t.name}
                className="w-[320px] shrink-0 spotlight-card rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-calm)] md:w-[380px]"
              >
                <Quote className="size-6 text-brand-sky" />
                <blockquote className="mt-3 text-[15px] leading-relaxed text-foreground">
                  “{t.text}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <img src={avatarUrl(t.name, 80)} alt="" className="size-10 rounded-full ring-2 ring-brand-soft" loading="lazy" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </MarqueeRow>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    { q: "Preciso me identificar?", a: "Não. Você recebe um apelido e avatar gerados pelo app. Só o e-mail é pedido para poder voltar à sua conta." },
    { q: "O voluntário sabe quem eu sou?", a: "Não. Ele também só enxerga seu apelido. A conversa é entre duas identidades geradas pelo app." },
    { q: "Isso substitui terapia ou atendimento médico?", a: "Não. Somos escuta acolhedora. Se você precisa de atendimento clínico, procure um profissional de saúde. Em emergência, ligue 188 (CVV) ou 192 (SAMU)." },
    { q: "Como faço para ser voluntário(a)?", a: "Você se cadastra, passa por revisão da equipe e — depois de aprovado(a) — recebe acesso à área de atendimento." },
    { q: "Meus dados são vendidos?", a: "Nunca. Não vendemos, não compartilhamos e usamos criptografia em trânsito. Conversas ficam disponíveis apenas para você e o(a) voluntário(a)." },
    { q: "Posso apagar minha conta?", a: "Sim, a qualquer momento. Peça pelo suporte e removemos seus dados." },
  ];
  return (
    <section id="faq" className="bg-brand-soft/40 py-20 md:py-28">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-green">Perguntas frequentes</span>
            <h2 className="mt-3 text-3xl font-bold text-primary md:text-4xl">Dúvidas comuns</h2>
          </div>
        </Reveal>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
          {items.map((it, i) => (
            <details key={i} className="group px-5 py-4 open:bg-brand-soft/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {it.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.a}</p>
            </details>
          ))}
        </div>
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
                  className="btn-shine inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-6 py-3 text-sm font-semibold text-primary transition hover:opacity-90"
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
          <div className="flex items-center gap-3">
            <Logo responsive decorative className="h-12 w-12 sm:h-14 sm:w-14 md:h-14 md:w-14 lg:h-16 lg:w-16" />
            <span className="text-base font-semibold text-primary">Desabafo Amigo</span>
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
            <li><a href="#origem" className="hover:text-primary inline-flex items-center gap-1"><ChevronRight className="size-3" aria-hidden />Nossa história</a></li>
            <li><a href="#missao" className="hover:text-primary inline-flex items-center gap-1"><ChevronRight className="size-3" aria-hidden />Como ajudamos</a></li>
            <li><a href="#jornada" className="hover:text-primary inline-flex items-center gap-1"><ChevronRight className="size-3" aria-hidden />Sua jornada</a></li>
            <li><a href="#depoimentos" className="hover:text-primary inline-flex items-center gap-1"><ChevronRight className="size-3" aria-hidden />Depoimentos</a></li>
            <li><a href="#faq" className="hover:text-primary inline-flex items-center gap-1"><ChevronRight className="size-3" aria-hidden />Dúvidas</a></li>
            <li><Link to="/pro/cadastro" className="hover:text-primary inline-flex items-center gap-1"><ChevronRight className="size-3" aria-hidden />Ser voluntário(a)</Link></li>
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
            O Desabafo Amigo não substitui atendimento de urgência.
          </p>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-4 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Desabafo Amigo. Feito com cuidado.</p>
          <Link to="/admin/login" className="hover:text-primary">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
