import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ArrowLeft, MessageCircleHeart, Loader2, LogOut, Clock, Users } from "lucide-react";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { matchQueueEntry } from "@/lib/queue.functions";
import { avatarUrl } from "@/lib/avatar";

export const Route = createFileRoute("/admin/atendimento")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAdminAal2();
  },
  component: AdminAtendimento,
});

type QueueRow = {
  id: string; user_id: string; topic: string | null; created_at: string;
  urgency?: "low" | "medium" | "high" | null; preferred_lang?: string | null;
  alias?: string;
};

type Row = {
  id: string;
  scheduled_at: string;
  topic: string;
  status: string;
  patient_id: string;
  professional_id: string | null;
  conversation_id: string | null;
  patient_name: string;
  pro_name: string;
  unread: number;
  last_at: string | null;
};

type Tab = "waiting" | "active" | "all";

const STATUS: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em andamento",
  completed: "Finalizada",
  cancelled: "Cancelada",
};

function AdminAtendimento() {
  const navigate = useNavigate();
  const match = useServerFn(matchQueueEntry);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("waiting");
  const [pickBusy, setPickBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMe(u.user?.id ?? null);
      await Promise.all([refresh(), refreshQueue()]);
    })();

    const chan = supabase
      .channel("admin-atendimento")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () => refreshQueue())
      .subscribe();
    return () => { supabase.removeChannel(chan); };
  }, []);

  async function refreshQueue() {
    const { data } = await supabase.from("queue")
      .select("id, user_id, topic, created_at, urgency, preferred_lang")
      .eq("status", "waiting").order("created_at");
    const list = (data ?? []) as QueueRow[];
    if (list.length) {
      const ids = list.map((r) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      const pm = new Map((profs ?? []).map((p) => [p.user_id, p.display_name ?? "Anônimo"]));
      list.forEach((r) => { r.alias = pm.get(r.user_id) ?? "Anônimo"; });
    }
    setQueue(list);
  }

  async function pickFromQueue(id: string) {
    setPickBusy(id);
    try {
      const { appointmentId } = await match({ data: { queueId: id } });
      navigate({ to: "/consulta/$id", params: { id: appointmentId } });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao assumir da fila.");
      setPickBusy(null);
    }
  }

  async function refresh() {
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, scheduled_at, topic, status, patient_id, professional_id, conversation_id")
      .order("scheduled_at", { ascending: false })
      .limit(200);
    const list = (appts ?? []) as Omit<Row, "patient_name" | "pro_name" | "unread" | "last_at">[];

    const ids = Array.from(new Set(list.flatMap((a) => [a.patient_id, a.professional_id].filter(Boolean) as string[])));
    const nameMap: Record<string, string> = {};
    if (ids.length) {
      const [{ data: profs }, { data: vols }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name").in("user_id", ids),
        supabase.from("volunteers").select("user_id, full_name").in("user_id", ids),
      ]);
      (profs ?? []).forEach((p) => { nameMap[p.user_id] = p.display_name ?? "Amigo(a)"; });
      (vols ?? []).forEach((v) => { if (v.full_name) nameMap[v.user_id] = v.full_name; });
    }

    const convIds = list.map((a) => a.conversation_id).filter(Boolean) as string[];
    const unreadMap: Record<string, { unread: number; last_at: string | null }> = {};
    if (convIds.length) {
      const { data: msgs } = await supabase
        .from("messages")
        .select("conversation_id, sender_id, read_at, created_at")
        .in("conversation_id", convIds);
      (msgs ?? []).forEach((m) => {
        const c = m.conversation_id as string;
        const entry = unreadMap[c] ?? { unread: 0, last_at: null };
        if (!m.read_at) entry.unread += 1;
        if (!entry.last_at || (m.created_at as string) > entry.last_at) entry.last_at = m.created_at as string;
        unreadMap[c] = entry;
      });
    }

    const enriched: Row[] = list.map((a) => ({
      ...a,
      patient_name: nameMap[a.patient_id] ?? "Amigo(a)",
      pro_name: a.professional_id ? (nameMap[a.professional_id] ?? "Voluntário(a)") : "— sem voluntário —",
      unread: a.conversation_id ? (unreadMap[a.conversation_id]?.unread ?? 0) : 0,
      last_at: a.conversation_id ? (unreadMap[a.conversation_id]?.last_at ?? null) : null,
    }));
    setRows(enriched);
    setLoading(false);
  }

  async function assumir(r: Row) {
    if (!me) return;
    if (!confirm(`Assumir esta conversa com ${r.patient_name}?`)) return;
    await supabase.from("appointments").update({ professional_id: me, status: "in_progress" }).eq("id", r.id);
    navigate({ to: "/consulta/$id", params: { id: r.id } });
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  const filtered = rows.filter((r) => {
    if (tab === "waiting") return r.status === "scheduled" || r.unread > 0;
    if (tab === "active") return r.status === "in_progress";
    return true;
  });

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" aria-label="Voltar" className="rounded-full p-2 text-muted-foreground hover:bg-muted">
              <ArrowLeft className="size-5" />
            </Link>
            <Logo size={28} />
            <span className="text-sm font-semibold text-primary">Central de atendimento</span>
          </div>
          <button onClick={signOut} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-4 rounded-2xl bg-brand-soft p-4 text-sm text-muted-foreground">
          Como administrador(a), você pode acompanhar todas as conversas e atender diretamente pessoas na fila, além de intervir em atendimentos em andamento quando necessário.
        </p>

        <div className="mb-4 flex gap-2">
          {(["waiting", "active", "all"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t ? "bg-primary text-primary-foreground shadow" : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {t === "waiting" ? "Aguardando / não lidas" : t === "active" ? "Em andamento" : "Todas"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid place-items-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="rounded-lg bg-brand-soft p-6 text-center text-sm text-muted-foreground">Nenhuma conversa nesta categoria.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageCircleHeart className="size-4 text-brand-green" />
                      <p className="truncate text-sm font-semibold text-foreground">{r.patient_name}</p>
                      {r.unread > 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">{r.unread} nova(s)</span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {r.topic} · {new Date(r.scheduled_at).toLocaleString("pt-BR")} · com {r.pro_name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Status: <span className="font-medium">{STATUS[r.status] ?? r.status}</span>
                      {r.last_at && <> · última msg {new Date(r.last_at).toLocaleString("pt-BR")}</>}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {(!r.professional_id || r.status === "scheduled") && (
                      <button onClick={() => assumir(r)} className="btn-primary text-xs">Assumir e atender</button>
                    )}
                    <Link to="/consulta/$id" params={{ id: r.id }} className="rounded-lg bg-secondary px-3 py-2 text-xs font-medium hover:bg-muted">
                      Abrir chat
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
