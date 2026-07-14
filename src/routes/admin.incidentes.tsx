import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShieldAlert, AlertTriangle, AlertCircle, Info, Save, UserX, CheckCircle2 } from "lucide-react";
import { ensureAdminAal2 } from "@/lib/adminGuard";

export const Route = createFileRoute("/admin/incidentes")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAdminAal2();
  },
  component: Incidentes,
  head: () => ({
    meta: [
      { title: "Incidentes de captura · Admin · Desabafo Amigo" },
      { name: "description", content: "Auditoria de tentativas de captura de tela nas conversas." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Severity = "low" | "medium" | "high";
type Incident = {
  id: string;
  user_id: string;
  appointment_id: string | null;
  conversation_id: string | null;
  reason: string;
  severity: Severity;
  user_agent: string | null;
  admin_notes: string | null;
  created_at: string;
};
type Flag = {
  user_id: string;
  reason: string;
  incident_count: number;
  flagged_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
  cleared: boolean;
};

const SEV_META: Record<Severity, { label: string; className: string; Icon: typeof AlertTriangle }> = {
  high: { label: "Alta", className: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertTriangle },
  medium: { label: "Média", className: "bg-amber-500/10 text-amber-700 border-amber-500/30", Icon: AlertCircle },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground border-border", Icon: Info },
};

function Incidentes() {
  const [items, setItems] = useState<Incident[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [tab, setTab] = useState<Severity | "all">("high");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // AUDITORIA: só metadados. Nunca fazemos join com `messages` — o conteúdo
    // da conversa nunca é exposto para admin, mesmo sob role admin.
    const [incRes, flagRes] = await Promise.all([
      supabase.from("screenshot_incidents")
        .select("id, user_id, appointment_id, conversation_id, reason, severity, user_agent, admin_notes, created_at")
        .order("created_at", { ascending: false }).limit(500),
      supabase.from("flagged_users")
        .select("user_id, reason, incident_count, flagged_at, reviewed_at, admin_notes, cleared")
        .order("flagged_at", { ascending: false }).limit(200),
    ]);
    setItems((incRes.data ?? []) as Incident[]);
    setFlags((flagRes.data ?? []) as Flag[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => (tab === "all" ? items : items.filter((i) => i.severity === tab)),
    [items, tab],
  );
  const counts = useMemo(() => ({
    high: items.filter((i) => i.severity === "high").length,
    medium: items.filter((i) => i.severity === "medium").length,
    low: items.filter((i) => i.severity === "low").length,
    all: items.length,
  }), [items]);
  const activeFlags = useMemo(() => flags.filter((f) => !f.cleared), [flags]);

  async function saveNotes(id: string) {
    setSavingId(id);
    await supabase.from("screenshot_incidents")
      .update({ admin_notes: notes[id] ?? "" }).eq("id", id);
    setSavingId(null);
    await load();
  }

  async function clearFlag(userId: string) {
    if (!confirm("Liberar este usuário para novas conversas?")) return;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("flagged_users")
      .update({
        cleared: true,
        reviewed_at: new Date().toISOString(),
        reviewed_by: u.user?.id ?? null,
      })
      .eq("user_id", userId);
    await load();
  }

  return (
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <Link to="/admin" aria-label="Voltar" className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <ArrowLeft className="size-5" />
          </Link>
          <ShieldAlert className="size-5 text-destructive" aria-hidden />
          <h1 className="text-lg font-semibold text-foreground">Incidentes de captura</h1>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-6">
        <p className="mb-4 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Auditoria por metadados.</strong> Esta tela lista apenas quando e como uma tentativa foi
          detectada — nunca o conteúdo da conversa. Mensagens permanecem privadas mesmo para administradores.
        </p>

        {/* Painel de reincidentes */}
        <section aria-labelledby="reincidentes-h" className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2">
            <UserX className="size-5 text-destructive" aria-hidden />
            <h2 id="reincidentes-h" className="text-base font-semibold text-destructive">
              Usuários em revisão de segurança ({activeFlags.length})
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Marcados automaticamente ao acumular 3+ incidentes de severidade alta em 30 dias.
            Novas conversas ficam bloqueadas até liberação.
          </p>
          {activeFlags.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum reincidente ativo no momento.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {activeFlags.map((f) => (
                <li key={f.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Usuário {f.user_id.slice(0, 8)}…</p>
                    <p className="text-xs text-muted-foreground">
                      {f.reason} · marcado em {new Date(f.flagged_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <button
                    onClick={() => clearFlag(f.user_id)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    <CheckCircle2 className="size-3.5" aria-hidden /> Liberar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div role="tablist" aria-label="Filtrar por severidade" className="mb-4 flex flex-wrap gap-2">
          {(["high", "medium", "low", "all"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`rounded-full border px-3 py-1 text-sm ${tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`}
            >
              {k === "all" ? "Todos" : SEV_META[k].label} · {counts[k]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum incidente nesta categoria.
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((i) => {
              const meta = SEV_META[i.severity];
              const Icon = meta.Icon;
              return (
                <li key={i.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                        <Icon className="size-3" aria-hidden /> {meta.label}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{i.reason}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(i.created_at).toLocaleString("pt-BR")} · usuário {i.user_id.slice(0, 8)}…
                          {i.appointment_id && <> · consulta {i.appointment_id.slice(0, 8)}…</>}
                        </p>
                        {i.user_agent && (
                          <p className="mt-1 max-w-2xl truncate text-[11px] text-muted-foreground/80" title={i.user_agent}>
                            UA: {i.user_agent}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label htmlFor={`n-${i.id}`} className="text-xs font-medium text-muted-foreground">Observação do admin</label>
                    <div className="mt-1 flex gap-2">
                      <textarea
                        id={`n-${i.id}`}
                        rows={2}
                        defaultValue={i.admin_notes ?? ""}
                        onChange={(e) => setNotes((n) => ({ ...n, [i.id]: e.target.value }))}
                        className="flex-1 resize-none rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-primary"
                        placeholder="Ex.: falso positivo (usuário trocou de aba para copiar link)"
                      />
                      <button
                        onClick={() => saveNotes(i.id)}
                        disabled={savingId === i.id}
                        className="inline-flex items-center gap-1 self-start rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        <Save className="size-3.5" aria-hidden /> Salvar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
