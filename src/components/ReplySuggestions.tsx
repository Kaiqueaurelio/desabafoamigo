import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, RefreshCcw } from "lucide-react";
import { suggestReplies } from "@/lib/ai.functions";

export function ReplySuggestions({
  conversationId,
  onPick,
}: {
  conversationId: string;
  onPick: (text: string) => void;
}) {
  const call = useServerFn(suggestReplies);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const { suggestions } = await call({ data: { conversationId } });
      setItems(suggestions);
      setOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-brand-soft disabled:opacity-50"
          title="Sugestões de resposta com IA"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
          Sugestões IA
        </button>
        {open && items.length > 0 && (
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
            title="Gerar novas sugestões"
          >
            <RefreshCcw className="size-3" /> renovar
          </button>
        )}
      </div>
      {err && <p className="mt-1 text-[11px] text-destructive">{err}</p>}
      {open && items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {items.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => {
                  onPick(s);
                  setOpen(false);
                }}
                className="max-w-md rounded-2xl border border-border bg-brand-soft/50 px-3 py-1.5 text-left text-xs text-foreground hover:border-primary hover:bg-brand-soft"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
