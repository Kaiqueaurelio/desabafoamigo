import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";

const MOODS = [
  { v: 1, emoji: "😢", label: "Muito mal" },
  { v: 2, emoji: "😕", label: "Mal" },
  { v: 3, emoji: "😐", label: "Neutro" },
  { v: 4, emoji: "🙂", label: "Bem" },
  { v: 5, emoji: "😊", label: "Muito bem" },
] as const;

export function MoodCheckIn({ userId }: { userId: string }) {
  const [last, setLast] = useState<{ mood: number; created_at: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("mood_entries")
        .select("mood, created_at")
        .eq("user_id", userId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setLast(data);
    })();
  }, [userId]);

  async function pick(mood: number) {
    if (saving) return;
    setSaving(true);
    const { data } = await supabase
      .from("mood_entries")
      .insert({ user_id: userId, mood })
      .select("mood, created_at")
      .single();
    if (data) {
      setLast(data);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Como você está agora?</h3>
          <p className="text-xs text-muted-foreground">Um toque no rosto que mais combina.</p>
        </div>
        {justSaved && (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            <Check className="size-3.5" /> Registrado
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.v}
            onClick={() => pick(m.v)}
            disabled={saving}
            aria-label={m.label}
            className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-xs transition ${last?.mood === m.v ? "border-primary bg-brand-soft" : "border-border bg-background hover:border-primary/40"}`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-muted-foreground">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
