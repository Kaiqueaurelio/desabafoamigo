import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShieldAlert, AlertTriangle, AlertCircle, Info, Save } from "lucide-react";

export const Route = createFileRoute("/admin/incidentes")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/admin/login" });
    const { data: roles } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", data.user.id).eq("role", "admin");
    if (!roles || roles.length === 0) throw redirect({ to: "/admin/login" });
  },
  component: Incidentes,
  head: () => ({
    meta: [
      { title: "Incidentes de captura · Admin · Desabafa Amigo" },
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

const SEV_META: Record<Severity, { label: string; className: string; Icon: typeof AlertTriangle }> = {
  high: { label: "Alta", className: "bg-destructive/10 text-destructive border-destructive/30", Icon: AlertTriangle },
  medium: { label: "Média", className: "bg-amber-500/10 text-amber-700 border-amber-500/30", Icon: AlertCircle },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground border-border", Icon: Info },
};

function Incidentes() {
  const [items, setItems] = useState<Incident[]>([]);
  const [tab, setTab] = useState<Severity | "all">("high");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    // AUDITORIA: só metadados. Nunca fazemos join com `messages` — o conteúdo
    // da conversa nunca é exposto para admin, mesmo sob role admin.
    const { data } = await supabase
      .from("screenshot_incidents")
      .select("id, user_id, appointment_id, conversation_id, reason, severity, user_agent, admin_notes, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    setItems((data ?? []) as Incident[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

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

  async function saveNotes(id: string) {
    setSavingId(id);
    await supabase.from("screenshot_incidents")
      .update({ admin_notes: notes[id] ?? "" }).eq("id", id);
    setSavingId(null);
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
