import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { ArrowLeft, Activity, Users, MessageCircleHeart, Clock, Star, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/metricas")({
  ssr: false,
  beforeLoad: async () => { await ensureAdminAal2(); },
  component: Metricas,
});

type Stats = {
  totalUsers: number;
  totalVolunteers: number;
  activeVolunteers: number;
  conversationsTotal: number;
  conversationsActive: number;
  waitingNow: number;
  avgWaitMin: number | null;
  avgRating: number | null;
  incidents30d: number;
  reportsOpen: number;
  todayStarted: number;
};

function Metricas() {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const [
        profs, vols, actVols, convs, actConvs, waiting, ratings, incs, reps, today,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("volunteers").select("*", { count: "exact", head: true }).eq("approval_status", "approved"),
        supabase.from("volunteers").select("*", { count: "exact", head: true }).eq("approval_status", "approved").eq("status", "online"),
        supabase.from("conversations").select("*", { count: "exact", head: true }),
        supabase.from("conversations").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("queue").select("created_at").eq("status", "waiting"),
        supabase.from("appointments").select("patient_rating").not("patient_rating", "is", null),
        supabase.from("screenshot_incidents").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("appointments").select("*", { count: "exact", head: true }).gte("created_at", startOfDay.toISOString()),
      ]);

      const now = Date.now();
      const waitMins = (waiting.data ?? []).map((w) => (now - +new Date(w.created_at)) / 60000);
      const avgWait = waitMins.length ? waitMins.reduce((a, b) => a + b, 0) / waitMins.length : null;
      const rNums = (ratings.data ?? []).map((r) => Number(r.patient_rating)).filter((n) => !isNaN(n));
      const avgR = rNums.length ? rNums.reduce((a, b) => a + b, 0) / rNums.length : null;

      setS({
        totalUsers: profs.count ?? 0,
        totalVolunteers: vols.count ?? 0,
        activeVolunteers: actVols.count ?? 0,
        conversationsTotal: convs.count ?? 0,
        conversationsActive: actConvs.count ?? 0,
        waitingNow: (waiting.data ?? []).length,
        avgWaitMin: avgWait,
        avgRating: avgR,
        incidents30d: incs.count ?? 0,
        reportsOpen: reps.count ?? 0,
        todayStarted: today.count ?? 0,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl p-6">
        <Link to="/admin" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-3" /> Voltar ao painel
        </Link>
        <h1 className="text-2xl font-bold text-primary">Métricas da comunidade</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral em tempo real. Dados anonimizados.</p>

        {loading || !s ? (
          <p className="mt-8 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card icon={<Users className="size-5" />} label="Usuários cadastrados" value={s.totalUsers} />
            <Card icon={<ShieldAlert className="size-5" />} label="Voluntários aprovados" value={s.totalVolunteers} />
            <Card icon={<Activity className="size-5" />} label="Voluntários online" value={s.activeVolunteers} accent />
            <Card icon={<MessageCircleHeart className="size-5" />} label="Conversas ativas" value={s.conversationsActive} />
            <Card icon={<MessageCircleHeart className="size-5" />} label="Conversas totais" value={s.conversationsTotal} />
            <Card icon={<Clock className="size-5" />} label="Iniciadas hoje" value={s.todayStarted} />
            <Card icon={<Clock className="size-5" />} label="Na fila agora" value={s.waitingNow} />
            <Card icon={<Clock className="size-5" />} label="Espera média (min)" value={s.avgWaitMin === null ? "—" : s.avgWaitMin.toFixed(1)} />
            <Card icon={<Star className="size-5" />} label="Nota média" value={s.avgRating === null ? "—" : s.avgRating.toFixed(2) + "★"} />
            <Card icon={<ShieldAlert className="size-5" />} label="Incidentes (30d)" value={s.incidents30d} accent={s.incidents30d > 0} />
            <Card icon={<ShieldAlert className="size-5" />} label="Denúncias abertas" value={s.reportsOpen} accent={s.reportsOpen > 0} />
          </div>
        )}
      </div>
    </main>
  );
}

function Card({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-primary/40 bg-brand-soft/50" : "border-border bg-card"}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={accent ? "text-primary" : "text-brand-green"}>{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
