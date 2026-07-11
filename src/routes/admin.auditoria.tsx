import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/admin/auditoria")({
  ssr: false,
  beforeLoad: async () => { await ensureAdminAal2(); },
  component: Auditoria,
});

type Row = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function Auditoria() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (q.trim()) {
      const term = `%${q.trim()}%`;
      query = query.or(`action.ilike.${term},target_type.ilike.${term},target_id.ilike.${term}`);
    }
    const { data } = await query;
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, []);

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl p-6">
        <Link to="/admin" className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-3" /> Voltar ao painel
        </Link>
        <div className="mb-4 flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-primary">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Auditoria</h1>
            <p className="text-sm text-muted-foreground">Últimos 200 eventos. Retido por 365 dias.</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void load(); }} className="mb-3 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por ação, tipo, id…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <button className="btn-primary text-sm">Buscar</button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhum evento encontrado.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left uppercase text-muted-foreground">
                  <th className="p-2">Data</th>
                  <th className="p-2">Ator</th>
                  <th className="p-2">Ação</th>
                  <th className="p-2">Alvo</th>
                  <th className="p-2">Metadados</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 align-top">
                    <td className="whitespace-nowrap p-2 text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="whitespace-nowrap p-2 font-mono text-[10px]">{r.actor_id?.slice(0, 8) ?? "—"}</td>
                    <td className="p-2 font-semibold text-foreground">{r.action}</td>
                    <td className="p-2">{r.target_type ? `${r.target_type}:${r.target_id?.slice(0, 8) ?? "—"}` : "—"}</td>
                    <td className="max-w-sm p-2">
                      <pre className="max-h-24 overflow-auto whitespace-pre-wrap break-words rounded bg-background/60 p-1 text-[10px] text-muted-foreground">
                        {JSON.stringify(r.metadata ?? {}, null, 0)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
