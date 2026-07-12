import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Users, NotebookPen, BookOpen, Flame } from "lucide-react";
import { avatarUrl } from "@/lib/avatar";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { BreathingButton } from "@/components/BreathingExercise";
import { OnboardingTour } from "@/components/OnboardingTour";
import { ComfortPhrase } from "@/components/ComfortPhrase";
import { loadStreak } from "@/lib/streak";


export const Route = createFileRoute("/_authenticated/inicio")({
  component: Home,
});

type Appt = {
  id: string; scheduled_at: string; topic: string; status: string; professional_id: string; patient_id: string;
};

function Home() {
  const [upcoming, setUpcoming] = useState<Appt[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [alias, setAlias] = useState<string>("");
  const [me, setMe] = useState<string>("");
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);
      loadStreak(u.user.id).then(setStreak).catch(() => {});

      const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", u.user.id).maybeSingle();
      setAlias(prof?.display_name ?? "");


      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_at, topic, status, professional_id, patient_id")
        .eq("patient_id", u.user.id)
        .in("status", ["scheduled", "in_progress"])
        .order("scheduled_at", { ascending: true })
        .limit(5);
      setUpcoming((data ?? []) as Appt[]);

      const ids = Array.from(new Set((data ?? []).map((a) => a.professional_id)));
      if (ids.length) {
        const { data: pros } = await supabase.from("volunteers").select("user_id, full_name, specialty").in("user_id", ids);
        const map: Record<string, string> = {};
        (pros ?? []).forEach((p) => { map[p.user_id] = `${p.full_name}${p.specialty ? " · " + p.specialty : ""}`; });
        setNames(map);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <OnboardingTour />
      <div className="flex items-center gap-4">
        {alias && <img src={avatarUrl(alias, 128)} alt="Seu avatar" className="size-16 rounded-full ring-2 ring-brand-soft" />}
        <div>
          <h1 className="text-2xl font-bold text-primary">Olá, {alias || "amigo(a)"} 👋</h1>
          <p className="text-sm text-muted-foreground">Este apelido e avatar foram gerados pelo app para preservar sua identidade.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickCard to="/conversar" icon={<Users className="size-5" />} title="Conversar agora" desc="Fila rápida com voluntário(a)" />
        <QuickCard to="/consultas" icon={<CalendarClock className="size-5" />} title="Minhas conversas" desc="Histórico" />
        <QuickCard to="/diario" icon={<NotebookPen className="size-5" />} title="Meu diário" desc="Registre como se sente" />
        <QuickCard to="/apoio" icon={<BookOpen className="size-5" />} title="Apoio & técnicas" desc="Respire, se acalme" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {me && <MoodCheckIn userId={me} />}
        <div className="flex flex-col justify-center rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">Precisa se acalmar agora?</p>
          <p className="text-xs text-muted-foreground">Toque para começar uma respiração guiada.</p>
          <div className="mt-3"><BreathingButton /></div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Conversas recentes</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não conversou por aqui.</p>
            <Link to="/conversar" className="btn-primary mt-4 inline-block">Conversar agora</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((a) => (
              <Link key={a.id} to="/consulta/$id" params={{ id: a.id }}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
                <div>
                  <p className="font-medium text-foreground">{a.topic}</p>
                  <p className="text-xs text-muted-foreground">{names[a.professional_id] ?? "Voluntário(a)"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-primary">{new Date(a.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p>
                  <p className="text-xs text-muted-foreground">{new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 rounded-2xl bg-brand-soft p-4 text-xs text-muted-foreground">
        O Desabafa Amigo oferece <strong>escuta acolhedora por voluntários treinados</strong>. Não é um serviço de psicologia, psiquiatria ou medicina, e não temos vínculo com esses profissionais.
      </p>
    </div>
  );
}

function QuickCard({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40">
      <div className="mb-2 grid size-10 place-items-center rounded-xl bg-brand-soft text-primary">{icon}</div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}
