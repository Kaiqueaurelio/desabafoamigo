import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, AlertTriangle, Bot, HeartHandshake, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { withPendingDatabaseTypes } from "@/lib/pending-database-types";

export const Route = createFileRoute("/admin/respostas-ia")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAdminAal2();
  },
  head: () => ({
    meta: [
      { title: "Respostas da IA — Admin" },
      { name: "description", content: "Histórico técnico e indicadores de respostas da Ella." },
    ],
  }),
  component: Page,
});

type ResponseEvent = {
  id: string;
  created_at: string;
  provider: "nvidia" | "lovable" | "none";
  degraded: boolean;
  severity: number;
  response_chars: number;
  latency_ms: number;
  forwarded_to_volunteer: boolean;
};

type Stats = { total: number; forwarded: number; degraded: number };

const providerLabel: Record<ResponseEvent["provider"], string> = {
  nvidia: "NVIDIA",
  lovable: "Lovable AI",
  none: "Indisponível",
};

function severityLabel(value: number): string {
  if (value >= 3) return "Urgente";
  if (value === 2) return "Atenção";
  if (value === 1) return "Leve";
  return "Não identificado";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function Page() {
  const [events, setEvents] = useState<ResponseEvent[] | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, forwarded: 0, degraded: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const db = withPendingDatabaseTypes(supabase);
      const [recent, total, forwarded, degraded] = await Promise.all([
        db
          .from("ai_response_events")
          .select(
            "id, created_at, provider, degraded, severity, response_chars, latency_ms, forwarded_to_volunteer",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        db.from("ai_response_events").select("id", { count: "exact", head: true }),
        db
          .from("ai_response_events")
          .select("id", { count: "exact", head: true })
          .eq("forwarded_to_volunteer", true),
        db
          .from("ai_response_events")
          .select("id", { count: "exact", head: true })
          .eq("degraded", true),
      ]);

      const queryError = recent.error ?? total.error ?? forwarded.error ?? degraded.error;
      if (queryError) throw queryError;

      setEvents((recent.data ?? []) as ResponseEvent[]);
      setStats({
        total: total.count ?? 0,
        forwarded: forwarded.count ?? 0,
        degraded: degraded.count ?? 0,
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar o histórico de respostas da IA.",
      );
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const handoffRate = stats.total ? Math.round((stats.forwarded / stats.total) * 100) : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Bot className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold">Respostas da IA</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Histórico técnico das respostas da Ella e acompanhamento dos pedidos de acolhimento
              humano.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadEvents()}
          disabled={loading}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </header>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
        <ShieldCheck className="mr-2 inline size-4 text-primary" aria-hidden />
        Privacidade: este painel não armazena nem exibe mensagens, respostas, anexos ou conteúdo
        emocional. Ele registra apenas provedor, desempenho, nível de risco e solicitação de
        encaminhamento.
      </div>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores de respostas da IA"
      >
        <Metric
          icon={<Activity className="size-4" />}
          label="Respostas registradas"
          value={stats.total.toLocaleString("pt-BR")}
        />
        <Metric
          icon={<HeartHandshake className="size-4" />}
          label="Encaminhadas a voluntários"
          value={stats.forwarded.toLocaleString("pt-BR")}
        />
        <Metric
          icon={<HeartHandshake className="size-4" />}
          label="Taxa de encaminhamento"
          value={`${handoffRate}%`}
        />
        <Metric
          icon={<AlertTriangle className="size-4" />}
          label="Respostas degradadas"
          value={stats.degraded.toLocaleString("pt-BR")}
        />
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <p className="font-medium">Não foi possível carregar os registros.</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="mt-3 font-medium text-primary underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="font-semibold">Registros recentes</h2>
            <p className="text-xs text-muted-foreground">
              Últimas 100 respostas, da mais recente para a mais antiga
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {events?.length ?? 0} registros carregados
          </span>
        </div>

        {loading && events === null ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : events?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Provedor</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Sinal de risco</th>
                  <th className="px-4 py-3 font-medium">Tempo</th>
                  <th className="px-4 py-3 font-medium">Tamanho</th>
                  <th className="px-4 py-3 font-medium">Encaminhamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      {formatDate(event.created_at)}
                    </td>
                    <td className="px-4 py-3">{providerLabel[event.provider]}</td>
                    <td className="px-4 py-3">
                      <span className={event.degraded ? "text-destructive" : "text-emerald-600"}>
                        {event.degraded ? "Degradada" : "Normal"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{severityLabel(event.severity)}</td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      {event.latency_ms.toLocaleString("pt-BR")} ms
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      {event.response_chars.toLocaleString("pt-BR")} caracteres
                    </td>
                    <td className="px-4 py-3">
                      {event.forwarded_to_volunteer ? (
                        <span className="font-medium text-primary">Solicitado</span>
                      ) : (
                        <span className="text-muted-foreground">Não solicitado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Bot className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
            <p className="mt-3 font-medium">Ainda não há respostas registradas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os próximos atendimentos com a Ella aparecerão aqui.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}
