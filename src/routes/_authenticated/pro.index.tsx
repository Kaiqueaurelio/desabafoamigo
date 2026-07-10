import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pro/")({
  beforeLoad: ({ context }) => {
    if (!context.isPro) throw redirect({ to: "/inicio" });
  },
  component: ProAgenda,
});

type Appt = { id: string; scheduled_at: string; topic: string; status: string; patient_id: string; };

const STATUS: Record<string, string> = { scheduled: "Agendada", in_progress: "Em andamento", completed: "Finalizada", cancelled: "Cancelada" };

function ProAgenda() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("appointments")
        .select("id, scheduled_at, topic, status, patient_id")
        .eq("professional_id", u.user.id)
        .order("scheduled_at", { ascending: false })
        .limit(50);
      setAppts((data ?? []) as Appt[]);
      const ids = Array.from(new Set((data ?? []).map((a) => a.patient_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
        const m: Record<string, string> = {};
        (profs ?? []).forEach((p) => { m[p.user_id] = p.display_name ?? "Paciente"; });
        setNames(m);
      }
    })();
  }, []);

  const upcoming = appts.filter((a) => a.status === "scheduled" || a.status === "in_progress");
  const past = appts.filter((a) => a.status === "completed" || a.status === "cancelled");

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-primary">Minha agenda</h1>
      <p className="mt-1 text-sm text-muted-foreground">Consultas com seus pacientes.</p>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Próximas ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Nenhuma consulta pendente.</p>
        ) : (
          <ul className="space-y-2">{upcoming.map((a) => <ApptRow key={a.id} a={a} name={names[a.patient_id]} />)}</ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Histórico</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem consultas finalizadas.</p>
        ) : (
          <ul className="space-y-2">{past.map((a) => <ApptRow key={a.id} a={a} name={names[a.patient_id]} />)}</ul>
        )}
      </section>
    </div>
  );
}

function ApptRow({ a, name }: { a: Appt; name?: string }) {
  return (
    <li>
      <Link to="/consulta/$id" params={{ id: a.id }} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{a.topic}</p>
          <p className="text-xs text-muted-foreground">{name ?? "Paciente"} · {new Date(a.scheduled_at).toLocaleString("pt-BR")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs">{STATUS[a.status]}</span>
      </Link>
    </li>
  );
}
