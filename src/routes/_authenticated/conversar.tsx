import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { enqueueMe, cancelMyQueue } from "@/lib/queue.functions";
import { Loader2, HeartHandshake, X, Sparkles, Pencil } from "lucide-react";
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
    let checking = false;
    const refreshQueue = async () => {
      if (checking) return;
      checking = true;
      try {
        const { data: current, error } = await supabase.from("queue")
          .select("status, conversation_id").eq("id", queueId).maybeSingle();
        if (error || !current) return;
        if (current.status === "matched" && current.conversation_id) {
          const { data: conv } = await supabase.from("conversations")
            .select("appointment_id").eq("id", current.conversation_id).maybeSingle();
          if (conv?.appointment_id) navigate({ to: "/consulta/$id", params: { id: conv.appointment_id } });
          return;
        }
        if (current.status === "cancelled") {
          setQueueId(null);
          setPosition(null);
          setErr("A entrada na fila foi cancelada. Você pode tentar novamente.");
          return;
        }
        const { data } = await supabase.from("queue").select("id").eq("status", "waiting")
          .lte("created_at", new Date().toISOString()).order("created_at");
        const idx = (data ?? []).findIndex((r) => r.id === queueId);
        setPosition(idx >= 0 ? idx + 1 : null);
      } finally {
        checking = false;
      }
    };
    void refreshQueue();
    const t = setInterval(() => void refreshQueue(), 5000);
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
    setErr("");
    try {
      await cancel({ data: { queueId } });
      setQueueId(null); setPosition(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Não foi possível sair da fila agora. Tente novamente.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl p-3 sm:p-6">
      <div className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex min-w-0 items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-primary"><HeartHandshake className="size-6" /></div>
          <div>
            <h1 className="text-xl font-bold text-primary">Conversar agora</h1>
            <p className="break-words text-xs text-muted-foreground">Você será conectado(a) a um(a) voluntário(a) disponível.</p>
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
              onReady={({ topic: t, urgency }) => { setTopic(t); void start(t, urgency); }}
              onSkip={() => setMode("manual")}
            />
          ) : (
            <>
              <label className="text-xs font-medium text-muted-foreground">O que gostaria de conversar? (opcional)</label>
              <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} maxLength={500}
                placeholder="Ex: estou ansioso, não consigo dormir..."
                className="mt-1 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-base sm:text-sm outline-none focus:border-primary" />
              {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setMode("choose")} className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                  Voltar
                </button>
                <button onClick={() => void start()} disabled={busy} className="btn-primary min-w-0 flex-1 whitespace-normal text-center">
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
              {position ? `Você é o ${position}º na fila.` : "Sua posição está sendo atualizada."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Assim que alguém aceitar, a conversa abre automaticamente.</p>

            <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-background/60 p-4 text-left">
              <p className="text-sm font-semibold text-foreground">Enquanto espera, respire 🌿</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Uma pausa curta ajuda a organizar o que você quer contar. Toque para começar.
              </p>
              <div className="mt-3"><BreathingButton /></div>
            </div>

            <button onClick={stop} className="mt-6 inline-flex min-h-11 items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm hover:bg-muted">
              <X className="size-4" aria-hidden /> Sair da fila
            </button>
          </div>

        )}
      </div>
    </div>
  );
}
