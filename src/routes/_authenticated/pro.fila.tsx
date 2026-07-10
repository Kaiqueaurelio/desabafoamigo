import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { matchQueueEntry } from "@/lib/queue.functions";
import { Users, Clock } from "lucide-react";
import { avatarUrl } from "@/lib/avatar";

export const Route = createFileRoute("/_authenticated/pro/fila")({
  beforeLoad: ({ context }) => { if (!context.isPro) throw redirect({ to: "/inicio" }); },
  component: Fila,
});

type Row = { id: string; user_id: string; topic: string | null; created_at: string; alias?: string; summary?: string };

function Fila() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const match = useServerFn(matchQueueEntry);
  const navigate = useNavigate();

  async function load() {
    const { data } = await supabase.from("queue")
      .select("id, user_id, topic, created_at")
      .eq("status", "waiting").order("created_at");
    const list = (data ?? []) as Row[];
    if (list.length) {
      const ids = list.map((r) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      const { data: sums } = await supabase.from("user_summaries").select("user_id, summary").in("user_id", ids);
      const pm = new Map((profs ?? []).map((p) => [p.user_id, p.display_name ?? "Anônimo"]));
      const sm = new Map((sums ?? []).map((s) => [s.user_id, s.summary]));
      list.forEach((r) => { r.alias = pm.get(r.user_id) ?? "Anônimo"; r.summary = sm.get(r.user_id) ?? ""; });
    }
    setRows(list);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("queue-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function accept(id: string) {
    setBusy(id);
    try {
      const { appointmentId } = await match({ data: { queueId: id } });
      navigate({ to: "/consulta/$id", params: { id: appointmentId } });
    } catch (e) { alert(e instanceof Error ? e.message : "Erro"); setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-primary"><Users className="size-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Fila de escuta</h1>
          <p className="text-sm text-muted-foreground">Pessoas aguardando para conversar agora.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Ninguém na fila no momento. Obrigado por estar disponível. 💛
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <img src={avatarUrl(r.alias || r.user_id, 96)} alt="" className="size-12 shrink-0 rounded-full ring-2 ring-brand-soft" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{r.alias}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3" /> aguarda {Math.max(1, Math.round((Date.now() - +new Date(r.created_at)) / 60000))} min
                    </span>
                    {r.summary && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-primary">Retornante</span>}
                  </div>
                  {r.topic && <p className="mt-1 line-clamp-2 text-sm text-foreground/80">"{r.topic}"</p>}
                  {r.summary && <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Contexto anterior:</span> {r.summary}</p>}
                </div>
                <button onClick={() => accept(r.id)} disabled={busy === r.id} className="btn-primary shrink-0 text-sm">
                  {busy === r.id ? "Abrindo..." : "Atender"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
