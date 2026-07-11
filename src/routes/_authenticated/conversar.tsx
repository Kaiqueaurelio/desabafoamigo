import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueueMe, cancelMyQueue } from "@/lib/queue.functions";
import { Loader2, HeartHandshake, X, Clock, Sparkles, Pencil } from "lucide-react";
import { BreathingButton } from "@/components/BreathingExercise";
import { TriageBot } from "@/components/TriageBot";


export const Route = createFileRoute("/_authenticated/conversar")({
  component: Instant,
});

function Instant() {
  const navigate = useNavigate();
  const enqueue = useServerFn(enqueueMe);
  const cancel = useServerFn(cancelMyQueue);
  const [mode, setMode] = useState<"choose" | "triage" | "manual">("choose");
  const [topic, setTopic] = useState("");
  const [queueId, setQueueId] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!queueId) return;
    const ch = supabase.channel(`q-${queueId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "queue", filter: `id=eq.${queueId}` },
        async (p) => {
          const row = p.new as { status: string; conversation_id: string | null };
          if (row.status === "matched" && row.conversation_id) {
            const { data: conv } = await supabase.from("conversations")
              .select("appointment_id").eq("id", row.conversation_id).maybeSingle();
            if (conv?.appointment_id) navigate({ to: "/consulta/$id", params: { id: conv.appointment_id } });
          }
        }).subscribe();
    channelRef.current = ch;
    const t = setInterval(async () => {
      const { data } = await supabase.from("queue").select("id").eq("status", "waiting")
        .lte("created_at", new Date().toISOString()).order("created_at");
      const idx = (data ?? []).findIndex((r) => r.id === queueId);
      setPosition(idx >= 0 ? idx + 1 : null);
    }, 4000);
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); clearInterval(t); };
  }, [queueId, navigate]);

  async function start(finalTopic?: string, urgency: "low" | "medium" | "high" = "low") {
    setErr(""); setBusy(true);
    try {
      const t = (finalTopic ?? topic).trim() || "Preciso conversar";
      const preferredLang = typeof navigator !== "undefined" ? (navigator.language || "pt-BR") : "pt-BR";
      const { queueId: id } = await enqueue({ data: { topic: t.slice(0, 500), urgency, preferredLang } });
      setQueueId(id);
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  }

  async function stop() {
    if (!queueId) return;
    await cancel({ data: { queueId } });
    setQueueId(null); setPosition(null);
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-primary"><HeartHandshake className="size-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-primary">Conversar agora</h1>
            <p className="text-xs text-muted-foreground">Você será conectado(a) a um(a) voluntário(a) disponível.</p>
          </div>
        </div>

        {!queueId ? (
          mode === "choose" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setMode("triage")}
                className="group rounded-2xl border border-border bg-brand-soft/40 p-4 text-left transition hover:border-primary hover:bg-brand-soft"
              >
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="size-5" />
                  <p className="text-sm font-semibold">Ajuda de um assistente IA</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Um bate-papo curto (2–4 perguntas) para preparar o(a) voluntário(a) e reduzir a espera.
                </p>
              </button>
              <button
                onClick={() => setMode("manual")}
                className="group rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary"
              >
                <div className="flex items-center gap-2 text-foreground">
                  <Pencil className="size-5" />
                  <p className="text-sm font-semibold">Escrever eu mesmo(a)</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Prefiro descrever com minhas próprias palavras.
                </p>
              </button>
            </div>
          ) : mode === "triage" ? (
            <TriageBot
              onReady={({ topic: t }) => { setTopic(t); void start(t); }}
              onSkip={() => setMode("manual")}
            />
          ) : (
            <>
              <label className="text-xs font-medium text-muted-foreground">O que gostaria de conversar? (opcional)</label>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} maxLength={500}
                placeholder="Ex: estou ansioso, não consigo dormir..."
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
              {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
              <div className="mt-4 flex gap-2">
                <button onClick={() => setMode("choose")} className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                  Voltar
                </button>
                <button onClick={() => void start()} disabled={busy} className="btn-primary flex-1">
                  {busy ? "Entrando na fila..." : "Entrar na fila e começar"}
                </button>
              </div>
            </>
          )
        ) : (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden />
            <p className="mt-4 text-lg font-semibold text-foreground">Aguardando um(a) voluntário(a)…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {position ? `Você é o ${position}º na fila.` : "Você está na fila."}
            </p>
            {position !== null && (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-xs text-primary">
                <Clock className="size-3" aria-hidden />
                Tempo estimado: ~{Math.max(1, position * 2)}–{position * 4} min
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Assim que alguém aceitar, a conversa abre automaticamente.</p>

            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-background/60 p-4 text-left">
              <p className="text-sm font-semibold text-foreground">Enquanto espera, respire 🌿</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Uma pausa curta ajuda a organizar o que você quer contar. Toque para começar.
              </p>
              <div className="mt-3"><BreathingButton /></div>
            </div>

            <button onClick={stop} className="mt-6 inline-flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm hover:bg-muted">
              <X className="size-4" aria-hidden /> Sair da fila
            </button>
          </div>

        )}
      </div>
    </div>
  );
}
