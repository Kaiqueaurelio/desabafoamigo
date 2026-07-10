import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Users, MessageSquareText, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: Home,
});

type Appt = {
  id: string; scheduled_at: string; topic: string; status: string; professional_id: string; patient_id: string;
};

function Home() {
  const [upcoming, setUpcoming] = useState<Appt[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);
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
      <h1 className="text-3xl font-bold text-primary">Olá 👋</h1>
      <p className="mt-1 text-muted-foreground">Bem-vindo ao seu espaço de cuidado.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <QuickCard to="/profissionais" icon={<Users className="size-5" />} title="Novo agendamento" desc="Escolha um profissional" />
        <QuickCard to="/consultas" icon={<CalendarClock className="size-5" />} title="Minhas consultas" desc="Histórico e próximas" />
        <QuickCard to="/profissionais" icon={<Stethoscope className="size-5" />} title="Ver profissionais" desc="Conheça a equipe" />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Próximas consultas</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Você ainda não tem consultas agendadas.</p>
            <Link to="/profissionais" className="btn-primary mt-4 inline-block">Agendar agora</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((a) => (
              <Link key={a.id} to="/consulta/$id" params={{ id: a.id }}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
                <div>
                  <p className="font-medium text-foreground">{a.topic}</p>
                  <p className="text-xs text-muted-foreground">{names[a.professional_id] ?? "Profissional"}</p>
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
