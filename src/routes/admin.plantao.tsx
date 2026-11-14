import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, MessageSquare, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ackEscalation, listOpenEscalations, resolveEscalation } from "@/lib/crisis.functions";

export const Route = createFileRoute("/admin/plantao")({
  component: PlantaoPage,
});

type Escalation = {
  id: string;
  conversation_id: string;
  user_id: string;
  raised_by: string;
  severity: "high" | "critical";
  status: "open" | "ack" | "resolved";
  notes: string | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
};

function PlantaoPage() {
  const list = useServerFn(listOpenEscalations);
  const ack = useServerFn(ackEscalation);
  const resolveFn = useServerFn(resolveEscalation);
  const [items, setItems] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    list()
      .then((rows) => alive && setItems(rows as Escalation[]))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [list]);

  useEffect(() => {
    const channel = supabase
      .channel("crisis_escalations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crisis_escalations" },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Escalation;
              if (prev.some((x) => x.id === row.id)) return prev;
              if (
                typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification("🚨 Novo escalonamento de crise", {
                  body: "Uma conversa foi marcada como risco alto.",
                });
              }
              return [row, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Escalation;
              if (row.status === "resolved") return prev.filter((x) => x.id !== row.id);
              return prev.map((x) => (x.id === row.id ? row : x));
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  async function onAck(id: string) {
    try {
      await ack({ data: { id } });
      toast.success("Você assumiu o acompanhamento.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onResolve(id: string) {
    const notes = window.prompt("Resumo do encaminhamento (opcional):") ?? undefined;
    try {
      await resolveFn({ data: { id, notes } });
      toast.success("Escalonamento encerrado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-destructive">
            <LifeBuoy className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider">Plantão de crise</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">Escalonamentos ativos</h1>
          <p className="text-sm text-muted-foreground">
            Conversas marcadas por voluntários como risco alto. Atualiza em tempo real.
          </p>
        </div>
        <button
          type="button"
          onClick={() => "Notification" in window && Notification.requestPermission()}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          Ativar notificações
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-2 size-6 text-emerald-500" />
          Nenhum escalonamento ativo agora.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={it.id}
              className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-destructive" />
                    <span className="text-sm font-semibold text-destructive uppercase">
                      {it.severity === "critical" ? "Crítico" : "Alto risco"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(it.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {it.notes && <p className="mt-1 text-sm">{it.notes}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Conversa <code>{it.conversation_id.slice(0, 8)}</code>
                    {it.acknowledged_at &&
                      ` · assumido em ${new Date(it.acknowledged_at).toLocaleTimeString("pt-BR")}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/admin/atendimento"
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <MessageSquare className="size-3.5" /> Ir para Central
                  </Link>
                  {it.status === "open" && (
                    <button
                      type="button"
                      onClick={() => onAck(it.id)}
                      className="rounded-full border border-primary/40 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-primary hover:bg-brand-soft/80"
                    >
                      Assumir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onResolve(it.id)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Encerrar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
