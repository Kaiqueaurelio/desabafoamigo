import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/consultas")({
  component: History,
});

type Appt = {
  id: string;
  scheduled_at: string;
  topic: string;
  status: string;
  professional_id: string;
  patient_id: string;
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Agendada", cls: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Em andamento", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "Finalizada", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelada", cls: "bg-red-100 text-red-800" },
};

function History() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { data: u, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!u.user)
          throw new Error("Sua sessão expirou. Entre novamente para ver suas conversas.");
        const { data, error: appointmentsError } = await supabase
          .from("appointments")
          .select("id, scheduled_at, topic, status, professional_id, patient_id")
          .eq("patient_id", u.user.id)
          .order("scheduled_at", { ascending: false });
        if (appointmentsError) throw appointmentsError;
        if (!active) return;
        setAppts((data ?? []) as Appt[]);
        const ids = Array.from(new Set((data ?? []).map((a) => a.professional_id)));
        if (ids.length) {
          const { data: pros, error: prosError } = await supabase
            .from("volunteers")
            .select("user_id, full_name")
            .in("user_id", ids);
          if (prosError) throw prosError;
          const map: Record<string, string> = {};
          (pros ?? []).forEach((p) => {
            map[p.user_id] = p.full_name ?? "Voluntário(a)";
          });
          if (active) setNames(map);
        } else if (active) {
          setNames({});
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Não foi possível carregar suas conversas.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-6">
      <h1 className="text-2xl font-bold text-primary">Minhas conversas</h1>
      <p className="mt-1 text-sm text-muted-foreground">Todas as suas conversas em um só lugar.</p>

      {loading ? (
        <div
          className="mt-8 flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" /> Carregando suas conversas…
        </div>
      ) : error ? (
        <div
          className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
          role="alert"
        >
          <p className="text-sm text-foreground">{error}</p>
          <button
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <RefreshCw className="size-4" /> Tentar novamente
          </button>
        </div>
      ) : appts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
          <Link to="/conversar" className="btn-primary mt-4 inline-block">
            Conversar agora
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {appts.map((a) => {
            const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.scheduled;
            return (
              <Link
                key={a.id}
                to="/consulta/$id"
                params={{ id: a.id }}
                className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{a.topic || "Conversa"}</p>
                  <p className="text-xs text-muted-foreground">
                    {names[a.professional_id] ?? "Voluntário(a)"} ·{" "}
                    {new Date(a.scheduled_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}
                >
                  {st.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
