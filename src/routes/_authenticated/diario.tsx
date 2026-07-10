import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { NotebookPen, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/diario")({
  component: Diario,
});

type Entry = { id: string; mood: number; note: string | null; created_at: string };
const EMOJIS = ["", "😢", "😕", "😐", "🙂", "😊"];

function Diario() {
  const [me, setMe] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [mood, setMood] = useState<number>(3);
  const [saving, setSaving] = useState(false);

  async function load(userId: string) {
    const { data } = await supabase.from("mood_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(60);
    setEntries((data ?? []) as Entry[]);
  }

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);
      await load(u.user.id);
    })();
  }, []);

  async function saveJournal(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !me) return;
    setSaving(true);
    await supabase.from("mood_entries").insert({ user_id: me, mood, note: text.trim() });
    setText(""); setMood(3);
    await load(me);
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Apagar este registro?")) return;
    await supabase.from("mood_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-primary"><NotebookPen className="size-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Diário emocional</h1>
          <p className="text-sm text-muted-foreground">Um espaço seu, privado. Ninguém mais vê o que você escreve aqui.</p>
        </div>
      </div>

      {me && <div className="mt-6"><MoodCheckIn userId={me} /></div>}

      <form onSubmit={saveJournal} className="mt-4 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Só desabafar</h3>
        <p className="text-xs text-muted-foreground">Escreva livremente o que está sentindo. É só para você.</p>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setMood(n)} aria-label={`Humor ${n}`}
              className={`grid size-10 place-items-center rounded-xl border text-xl transition ${mood === n ? "border-primary bg-brand-soft" : "border-border"}`}>
              {EMOJIS[n]}
            </button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={2000}
          placeholder="O que está passando pela sua cabeça hoje?"
          className="mt-3 w-full resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
        <button type="submit" disabled={saving || !text.trim()} className="btn-primary mt-3 text-sm">
          {saving ? "Salvando..." : "Guardar no diário"}
        </button>
      </form>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-foreground">Seus registros</h2>
        {entries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Ainda não há registros. Comece agora ☝️</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <span className="text-3xl">{EMOJIS[e.mood]}</span>
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {new Date(e.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {e.note && <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{e.note}</p>}
                </div>
                <button onClick={() => remove(e.id)} aria-label="Apagar" className="self-start rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
