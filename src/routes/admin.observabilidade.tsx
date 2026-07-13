import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { ArrowLeft, AlertTriangle, Star, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/observabilidade")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAdminAal2();
  },
  component: ObservabilityPage,
});

type Range = "24h" | "7d" | "30d" | "90d";

const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30, "90d": 24 * 90 };

type ErrorRow = {
  id: string;
  message: string;
  url: string | null;
  user_agent: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type NpsRow = {
  id: string;
  score: number;
  comment: string | null;
  created_at: string;
  conversation_id: string | null;
};

function ObservabilityPage() {
  const [range, setRange] = useState<Range>("7d");
  const [tab, setTab] = useState<"errors" | "nps">("errors");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [nps, setNps] = useState<NpsRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - RANGE_HOURS[range] * 3600_000).toISOString();
      const [errRes, npsRes] = await Promise.all([
        supabase
          .from("error_events")
          .select("id,message,url,user_agent,created_at,metadata")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("nps_responses")
          .select("id,score,comment,created_at,conversation_id")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      setErrors((errRes.data ?? []) as ErrorRow[]);
      setNps((npsRes.data ?? []) as NpsRow[]);
      setLoading(false);
    })();
  }, [range]);

  const errorMetrics = useMemo(() => {
    const total = errors.length;
    const byMessage = new Map<string, number>();
    for (const e of errors) byMessage.set(e.message, (byMessage.get(e.message) ?? 0) + 1);
    const top = [...byMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const uniquePaths = new Set(errors.map((e) => e.url ?? "")).size;
    return { total, top, uniquePaths };
  }, [errors]);

  const npsMetrics = useMemo(() => {
    const total = nps.length;
    if (total === 0) return { total, avg: 0, promoters: 0, passives: 0, detractors: 0, nps: 0 };
    const promoters = nps.filter((n) => n.score >= 9).length;
    const passives = nps.filter((n) => n.score >= 7 && n.score <= 8).length;
    const detractors = nps.filter((n) => n.score <= 6).length;
    const avg = nps.reduce((s, n) => s + n.score, 0) / total;
    const npsScore = Math.round(((promoters - detractors) / total) * 100);
    return { total, avg, promoters, passives, detractors, nps: npsScore };
  }, [nps]);

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-semibold text-primary">Observabilidade</span>
          </div>
          <Link to="/admin" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {(["24h", "7d", "30d", "90d"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  range === r ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(["errors", "nps"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {t === "errors" ? "Erros" : "NPS"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : tab === "errors" ? (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Metric label="Eventos" value={errorMetrics.total} icon={<AlertTriangle className="size-4" />} />
              <Metric label="Mensagens distintas" value={errorMetrics.top.length} />
              <Metric label="URLs afetadas" value={errorMetrics.uniquePaths} />
            </div>

            {errorMetrics.top.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Top mensagens</p>
                <ul className="space-y-2 text-sm">
                  {errorMetrics.top.map(([msg, count]) => (
                    <li key={msg} className="flex items-start justify-between gap-3">
                      <span className="line-clamp-2 text-muted-foreground">{msg}</span>
                      <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Últimos eventos</p>
              {errors.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem erros no período. 🎉</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-4">Quando</th>
                        <th className="py-2 pr-4">Mensagem</th>
                        <th className="py-2 pr-4">URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.slice(0, 100).map((e) => (
                        <tr key={e.id} className="border-b border-border/50 align-top">
                          <td className="py-2 pr-4 text-xs text-muted-foreground">
                            {new Date(e.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-foreground">{e.message}</td>
                          <td className="py-2 pr-4 text-xs text-muted-foreground">{shortPath(e.url)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Metric label="Respostas" value={npsMetrics.total} icon={<Star className="size-4" />} />
              <Metric label="Média" value={npsMetrics.avg ? npsMetrics.avg.toFixed(1) : "—"} />
              <Metric label="NPS" value={npsMetrics.total ? npsMetrics.nps : "—"} />
              <Metric label="Promotores" value={npsMetrics.promoters} />
              <Metric label="Detratores" value={npsMetrics.detractors} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Comentários anônimos</p>
              {nps.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem respostas no período.</p>
              ) : (
                <ul className="space-y-3">
                  {nps.map((n) => (
                    <li key={n.id} className="rounded-xl border border-border/60 p-3">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${
                            n.score >= 9
                              ? "bg-emerald-100 text-emerald-800"
                              : n.score >= 7
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          Nota {n.score}
                        </span>
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-foreground">{n.comment?.trim() || <span className="text-muted-foreground">Sem comentário</span>}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function shortPath(url: string | null) {
  if (!url) return "—";
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}
