import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/consultas")({
  component: History,
});

type Appt = {
  id: string; scheduled_at: string; topic: string; status: string;
  professional_id: string; patient_id: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  scheduled:   { label: "Agendada",     cls: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Em andamento", cls: "bg-amber-100 text-amber-800" },
  completed:   { label: "Finalizada",   cls: "bg-emerald-100 text-emerald-800" },
  cancelled:   { label: "Cancelada",    cls: "bg-red-100 text-red-800" },
};

function History() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("appointments")
        .select("id, scheduled_at, topic, status, professional_id, patient_id")
        .eq("patient_id", u.user.id)
        .order("scheduled_at", { ascending: false });
      setAppts((data ?? []) as Appt[]);
      const ids = Array.from(new Set((data ?? []).map((a) => a.professional_id)));
      if (ids.length) {
        const { data: pros } = await supabase.from("volunteers").select("user_id, full_name").in("user_id", ids);
        const map: Record<string, string> = {};
        (pros ?? []).forEach((p) => { map[p.user_id] = p.full_name ?? "Voluntário(a)"; });
        setNames(map);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-primary">Minhas conversas</h1>
      <p className="mt-1 text-sm text-muted-foreground">Todas as suas conversas em um só lugar.</p>

      {appts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
          <Link to="/conversar" className="btn-primary mt-4 inline-block">Conversar agora</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {appts.map((a) => {
            const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.scheduled;
            return (
              <Link key={a.id} to="/consulta/$id" params={{ id: a.id }}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{a.topic}</p>
                  <p className="text-xs text-muted-foreground">{names[a.professional_id] ?? "Voluntário(a)"} · {new Date(a.scheduled_at).toLocaleString("pt-BR")}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
