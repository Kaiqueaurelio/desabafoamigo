import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { MetricsGridSkeleton } from "@/components/AdminSkeletons";

export const Route = createFileRoute("/admin/inteligencia")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAdminAal2();
  },
  head: () => ({
    meta: [
      { title: "Inteligência de Acolhimento — Admin" },
      { name: "description", content: "Indicadores agregados e anônimos do acolhimento." },
      { property: "og:title", content: "Inteligência de Acolhimento" },
      { property: "og:description", content: "Indicadores agregados do Desabafo Amigo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type K = { label: string; value: string };

function Page() {
  const [k, setK] = useState<K[] | null>(null);
  useEffect(() => {
    (async () => {
      const c = (q: { count: number | null }) => q.count ?? 0;
      const [all, ended, active, queueAll, matched, waiting, vols, avail, crisis] =
        await Promise.all([
          supabase.from("conversations").select("*", { count: "exact", head: true }),
          supabase
            .from("conversations")
            .select("*", { count: "exact", head: true })
            .not("ended_at", "is", null),
          supabase
            .from("conversations")
            .select("*", { count: "exact", head: true })
            .eq("status", "active"),
          supabase.from("queue").select("*", { count: "exact", head: true }),
          supabase
            .from("queue")
            .select("created_at, updated_at")
            .not("matched_volunteer_id", "is", null)
            .limit(500),
          supabase
            .from("queue")
            .select("*", { count: "exact", head: true })
            .eq("status", "waiting"),
          supabase
            .from("volunteers")
            .select("*", { count: "exact", head: true })
            .eq("approval_status", "approved"),
          supabase
            .from("volunteers")
            .select("*", { count: "exact", head: true })
            .eq("approval_status", "approved")
            .eq("status", "available"),
          supabase.from("crisis_escalations").select("*", { count: "exact", head: true }),
        ]);
      const waits = (matched.data ?? [])
        .map((r) => (+new Date(r.updated_at) - +new Date(r.created_at)) / 60000)
        .filter((n) => n >= 0);
      const avg = waits.length
        ? (waits.reduce((a, b) => a + b, 0) / waits.length).toFixed(1) + " min"
        : "sem dados";
      const total = c(all);
      setK([
        { label: "Sessões com voluntários", value: String(total) },
        { label: "Atendimentos concluídos", value: String(c(ended)) },
        { label: "Em andamento agora", value: String(c(active)) },
        { label: "Pedidos de apoio humano", value: String(c(queueAll)) },
        { label: "Na fila agora", value: String(c(waiting)) },
        { label: "Tempo médio de espera", value: avg },
        { label: "Voluntários aprovados", value: String(c(vols)) },
        { label: "Disponíveis agora", value: String(c(avail)) },
        { label: "Encaminhamentos de crise", value: String(c(crisis)) },
        {
          label: "Taxa de conclusão",
          value: total ? Math.round((c(ended) / total) * 100) + "%" : "sem dados",
        },
      ]);
    })();
  }, []);
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <h1 className="font-display text-2xl font-semibold">Inteligência de Acolhimento</h1>
      <p className="text-sm text-muted-foreground">
        Somente dados reais e agregados. Nenhum conteúdo de conversa é exibido. Conversas com o
        Amigo IA não são armazenadas no servidor, por isso não entram nestes números.
      </p>
      {!k ? (
        <MetricsGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {k.map((x) => (
            <div key={x.label} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{x.label}</p>
              <p className="mt-1 text-2xl font-semibold">{x.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
