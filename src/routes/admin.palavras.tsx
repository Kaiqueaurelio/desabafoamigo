import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus, Shield } from "lucide-react";

type BlockedWord = {
  id: string;
  term: string;
  severity: "flag" | "block";
  created_at: string;
};

function BlockedWordsPage() {
  const [items, setItems] = useState<BlockedWord[]>([]);
  const [term, setTerm] = useState("");
  const [severity, setSeverity] = useState<"flag" | "block">("flag");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("blocked_words")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as BlockedWord[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    const t = term.trim().toLowerCase();
    if (!t) return;
    const { error } = await supabase.from("blocked_words").insert({ term: t, severity });
    if (error) {
      toast.error(error.message);
      return;
    }
    setTerm("");
    toast.success("Termo adicionado.");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("blocked_words").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido.");
    load();
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center gap-3">
        <Shield className="size-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Palavras bloqueadas</h1>
          <p className="text-sm text-muted-foreground">
            Termos que devem ser sinalizados ou bloqueados no chat.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Termo</label>
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2 text-sm"
              placeholder="palavra ou frase"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Severidade</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as "flag" | "block")}
              className="block rounded-lg border border-border bg-background p-2 text-sm"
            >
              <option value="flag">Sinalizar</option>
              <option value="block">Bloquear</option>
            </select>
          </div>
          <button
            onClick={add}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="size-4" /> Adicionar
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum termo cadastrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((w) => (
              <li key={w.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{w.term}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.severity === "block" ? "Bloquear envio" : "Sinalizar para revisão"}
                  </p>
                </div>
                <button
                  onClick={() => remove(w.id)}
                  aria-label={`Remover ${w.term}`}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/palavras")({
  ssr: false,
  beforeLoad: async () => {
    const { ensureAdminAal2 } = await import("@/lib/adminGuard");
    await ensureAdminAal2();
  },
  component: BlockedWordsPage,
  head: () => ({ meta: [{ title: "Palavras bloqueadas · Admin" }] }),
});
