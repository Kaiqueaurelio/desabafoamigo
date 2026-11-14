import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { triageStep } from "@/lib/ai.functions";
import { Sparkles, Send, Loader2, AlertTriangle, PhoneCall } from "lucide-react";

type Turn = { role: "user" | "assistant"; content: string };

export function TriageBot({
  onReady,
  onSkip,
}: {
  onReady: (result: { topic: string; urgency: "low" | "medium" | "high" }) => void;
  onSkip: () => void;
}) {
  const call = useServerFn(triageStep);
  const [history, setHistory] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("low");
  const [done, setDone] = useState<{ topic: string; urgency: "low" | "medium" | "high" } | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void step([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function step(next: Turn[]) {
    setBusy(true);
    try {
      const r = await call({ data: { history: next } });
      const updated: Turn[] = [...next, { role: "assistant", content: r.reply }];
      setHistory(updated);
      setUrgency(r.urgency);
      if (r.done && r.topic) {
        setDone({ topic: r.topic, urgency: r.urgency });
      }
    } catch (e) {
      setHistory((h) => [
        ...h,
        { role: "assistant", content: e instanceof Error ? e.message : "Erro. Tente novamente." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    const next: Turn[] = [...history, { role: "user", content: text }];
    setHistory(next);
    await step(next);
  }

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-3 flex min-w-0 items-start gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-brand-soft text-primary">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-primary">Antes de entrar na fila</p>
          <p className="text-[11px] text-muted-foreground">
            Um assistente amigo faz 2–4 perguntas para preparar o(a) voluntário(a). Você pode pular
            quando quiser.
          </p>
        </div>
      </div>

      {urgency === "high" && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="text-xs">
            <p className="font-semibold text-destructive">Se estiver em risco agora, ligue já:</p>
            <a
              href="tel:188"
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1 text-[11px] font-semibold text-destructive-foreground"
            >
              <PhoneCall className="size-3" /> CVV 188
            </a>
          </div>
        </div>
      )}

      <div className="max-h-64 min-w-0 space-y-2 overflow-x-hidden overflow-y-auto rounded-xl bg-background/60 p-3">
        {history.map((t, i) => (
          <div key={i} className={t.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block min-w-0 max-w-[90%] break-words [overflow-wrap:anywhere] rounded-2xl px-3 py-1.5 text-sm ${
                t.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {t.content}
            </span>
          </div>
        ))}
        {busy && (
          <div className="text-left text-xs text-muted-foreground">
            <Loader2 className="inline size-3 animate-spin" /> pensando…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {done ? (
        <div className="mt-3 rounded-xl border border-primary/30 bg-brand-soft/50 p-3">
          <p className="text-xs font-medium text-primary">Resumo para o(a) voluntário(a):</p>
          <p className="mt-1 text-sm text-foreground">"{done.topic}"</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={onSkip}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              Editar manualmente
            </button>
            <button onClick={() => onReady(done)} className="btn-primary text-xs">
              Entrar na fila
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="mt-3 flex min-w-0 items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={500}
            placeholder="Escreva sua resposta…"
            className="max-h-32 min-h-10 min-w-0 flex-1 resize-none rounded-2xl border border-border bg-background px-3 py-2 text-base sm:text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            aria-label="Enviar"
          >
            <Send className="size-4" />
          </button>
        </form>
      )}

      <div className="mt-3 text-center">
        <button
          onClick={onSkip}
          className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
        >
          Pular triagem e escrever eu mesmo(a)
        </button>
      </div>
    </div>
  );
}
