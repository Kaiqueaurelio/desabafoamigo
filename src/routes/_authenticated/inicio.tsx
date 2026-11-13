import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Users, NotebookPen, BookOpen, Flame, Volume2, Loader2, ChevronDown, Bot, HeartHandshake, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { avatarUrl } from "@/lib/avatar";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { BreathingButton } from "@/components/BreathingExercise";
import { OnboardingTour } from "@/components/OnboardingTour";
import { ComfortPhrase } from "@/components/ComfortPhrase";
import { FollowUpPrompt } from "@/components/FollowUpPrompt";
import { VolunteerTrainingBanner } from "@/components/VolunteerTrainingBanner";
import { PushNotificationCard } from "@/components/PushNotificationCard";
import { loadStreak } from "@/lib/streak";


export const Route = createFileRoute("/_authenticated/inicio")({
  component: Home,
});

type Appt = {
  id: string; scheduled_at: string; topic: string; status: string; professional_id: string; patient_id: string;
};

const PAGE_SIZE = 5;

function Home() {
  const [upcoming, setUpcoming] = useState<Appt[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [alias, setAlias] = useState<string>("");
  const [me, setMe] = useState<string>("");
  const [streak, setStreak] = useState<number>(0);
  const [visible, setVisible] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  async function fetchPage(userId: string, from: number, to: number) {
    const { data } = await supabase
      .from("appointments")
      .select("id, scheduled_at, topic, status, professional_id, patient_id")
      .eq("patient_id", userId)
      .in("status", ["scheduled", "in_progress"])
      .order("scheduled_at", { ascending: true })
      .range(from, to);
    const rows = (data ?? []) as Appt[];
    const ids = Array.from(new Set(rows.map((a) => a.professional_id)));
    if (ids.length) {
      const { data: pros } = await supabase.from("volunteers").select("user_id, full_name, specialty").in("user_id", ids);
      const map: Record<string, string> = {};
      (pros ?? []).forEach((p) => { map[p.user_id] = `${p.full_name}${p.specialty ? " · " + p.specialty : ""}`; });
      setNames((prev) => ({ ...prev, ...map }));
    }
    return rows;
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setInitialLoading(false); return; }
      setMe(u.user.id);
      loadStreak(u.user.id).then(setStreak).catch(() => {});

      const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", u.user.id).maybeSingle();
      setAlias(prof?.display_name ?? "");

      // fetch PAGE_SIZE + 1 to know if there are more pages
      const rows = await fetchPage(u.user.id, 0, PAGE_SIZE);
      setHasMore(rows.length > PAGE_SIZE);
      setUpcoming(rows.slice(0, PAGE_SIZE));
      setVisible(PAGE_SIZE);
      setInitialLoading(false);
    })();
  }, []);

  async function loadMore() {
    if (!me || loadingMore) return;
    setLoadingMore(true);
    const from = visible;
    const to = visible + PAGE_SIZE;
    const rows = await fetchPage(me, from, to);
    setUpcoming((prev) => [...prev, ...rows.slice(0, PAGE_SIZE)]);
    setHasMore(rows.length > PAGE_SIZE);
    setVisible(visible + PAGE_SIZE);
    setLoadingMore(false);
  }

  return (
    <div id="conteudo" className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <OnboardingTour />

      <VolunteerTrainingBanner />
      <div className="mb-4">
        <PushNotificationCard />
      </div>
      <FollowUpPrompt />






      {/* Hero card */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-soft/60 via-card to-card p-6 shadow-sm sm:p-8">
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 size-32 rounded-full bg-primary/10 blur-3xl sm:size-56" />
        <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 sm:gap-5">
          {alias && (
            <img src={avatarUrl(alias, 128)} alt="Seu avatar" className="size-14 shrink-0 rounded-full ring-2 ring-brand-soft sm:size-16" />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-primary sm:text-2xl">
              Olá, {alias || "amigo(a)"} <span aria-hidden>👋</span>
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Apelido e avatar gerados pelo app para preservar sua identidade.
            </p>
          </div>
          {streak > 0 && (
            <div
              className="hidden shrink-0 items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-3 py-2 backdrop-blur sm:flex"
              title={`${streak} dia(s) seguidos de cuidado`}
            >
              <Flame className="size-4 text-orange-500" aria-hidden />
              <div className="leading-tight">
                <p className="text-lg font-bold text-foreground">{streak}</p>
                <p className="text-[10px] text-muted-foreground">dia{streak > 1 ? "s" : ""}</p>
              </div>
            </div>
          )}
        </div>
        <div className="relative mt-5">
          <ComfortPhrase />
        </div>
      </section>

      <section className="mt-6" aria-labelledby="choose-conversation">
        <div className="mb-3">
          <h2 id="choose-conversation" className="text-lg font-bold text-primary sm:text-xl">Como você gostaria de conversar?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Escolha o tipo de acolhimento que combina com seu momento.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/ia" className="group interactive relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-brand-soft via-card to-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md sm:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-brand-sky/20 blur-2xl transition group-hover:scale-125" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Bot className="size-6" /></span>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">IA</span>
            </div>
            <h3 className="relative mt-4 text-base font-bold text-foreground">Conversar com o Amigo IA</h3>
            <p className="relative mt-1 text-sm leading-relaxed text-muted-foreground">Desabafe com uma inteligência artificial de apoio, no seu ritmo.</p>
            <span className="relative mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Começar conversa <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
          <Link to="/conversar" className="group interactive relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-6">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-brand-green/15 blur-2xl transition group-hover:scale-125" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-primary"><HeartHandshake className="size-6" /></span>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">Humano</span>
            </div>
            <h3 className="relative mt-4 text-base font-bold text-foreground">Conversar com voluntário</h3>
            <p className="relative mt-1 text-sm leading-relaxed text-muted-foreground">Peça para conversar com uma pessoa treinada em escuta acolhedora.</p>
            <span className="relative mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Encontrar acolhimento <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        </div>
      </section>

      {/* Wellbeing band */}
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {me && <MoodCheckIn userId={me} />}
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Precisa se acalmar agora?</p>
          <p className="mt-1 text-xs text-muted-foreground">Uma respiração guiada em 1 minuto pode ajudar.</p>
          <div className="mt-3"><BreathingButton /></div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Explore seu espaço</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <QuickCard to="/ia" icon={<Bot className="size-5" />} title="Amigo IA" desc="Converse com a inteligência artificial" tone="primary" />
          <QuickCard to="/consultas" icon={<CalendarClock className="size-5" />} title="Minhas conversas" desc="Histórico" />
          <QuickCard to="/diario" icon={<NotebookPen className="size-5" />} title="Meu diário" desc="Registre como se sente" />
          <QuickCard to="/relaxar" icon={<Volume2 className="size-5" />} title="Relaxar" desc="Áudios, frases e imagens" />
          <QuickCard to="/apoio" icon={<BookOpen className="size-5" />} title="Apoio & técnicas" desc="Respire, se acalme" />
        </div>
      </section>

      {/* Recent conversations */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Conversas recentes</h2>
          {upcoming.length > 0 && (
            <Link to="/consultas" className="text-xs font-medium text-primary hover:underline">Ver todas</Link>
          )}
        </div>
        {initialLoading ? (
          <div className="space-y-2" aria-busy="true" aria-live="polite">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Skeleton className="ml-auto h-3 w-14" />
                    <Skeleton className="ml-auto h-3 w-10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não conversou por aqui.</p>
            <Link to="/conversar" className="btn-primary mt-4 inline-block">Conversar agora</Link>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {upcoming.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/consulta/$id"
                    params={{ id: a.id }}
                    className="interactive grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="min-w-0">
                      <p
                        className="line-clamp-1 break-words text-sm font-medium text-foreground sm:text-base"
                        title={a.topic}
                      >
                        {a.topic}
                      </p>
                      <p
                        className="line-clamp-1 break-words text-xs text-muted-foreground"
                        title={names[a.professional_id] ?? "Voluntário(a)"}
                      >
                        {names[a.professional_id] ?? "Voluntário(a)"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-primary sm:text-sm">
                        {new Date(a.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-[11px] text-muted-foreground sm:text-xs">
                        {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="interactive gap-2"
                  aria-label="Carregar mais conversas"
                >
                  {loadingMore ? (
                    <><Loader2 className="size-4 animate-spin" aria-hidden /> Carregando…</>
                  ) : (
                    <><ChevronDown className="size-4" aria-hidden /> Carregar mais</>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </section>


      <p className="mt-10 rounded-2xl bg-brand-soft/60 p-4 text-xs text-muted-foreground">
        O Desabafo Amigo oferece <strong>escuta acolhedora por voluntários treinados</strong>. Não é um serviço de psicologia, psiquiatria ou medicina, e não temos vínculo com esses profissionais.
      </p>

      {/* espaço para o botão de emergência flutuante não cobrir o rodapé */}
      <div aria-hidden className="h-24" />
    </div>
  );
}

function QuickCard({ to, icon, title, desc, tone }: { to: string; icon: React.ReactNode; title: string; desc: string; tone?: "primary" }) {
  return (
    <Link
      to={to}
      className={`group interactive hover-lift block rounded-2xl border p-5 ${
        tone === "primary"
          ? "border-primary/30 bg-gradient-to-br from-primary/8 to-card hover:border-primary/50"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div aria-hidden className={`mb-3 grid size-10 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${
        tone === "primary" ? "bg-primary/15 text-primary" : "bg-brand-soft text-primary"
      }`}>{icon}</div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}


