import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, MessageSquareHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; label: string; body: string; category: string };

export function VolunteerTemplatesManager() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: "", body: "", category: "Personalizado" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("volunteer_templates")
      .select("id, label, body, category")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.label.trim() || !form.body.trim()) {
      toast.error("Preencha o rótulo e o texto");
      return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("volunteer_templates").insert({
      volunteer_id: u.user.id,
      label: form.label.trim(),
      body: form.body.trim(),
      category: form.category.trim() || "Personalizado",
      position: items.length,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setForm({ label: "", body: "", category: form.category });
    toast.success("Modelo adicionado");
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("volunteer_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((r) => r.id !== id));
    toast.success("Modelo removido");
  }

  return (
    <section id="modelos" className="mt-8 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <MessageSquareHeart className="size-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold text-foreground">Meus modelos rápidos</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Crie frases que você usa com frequência. Aparecem no menu "Templates" durante a conversa.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr]">
        <input
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="Rótulo (ex: Saudação)"
          maxLength={60}
          className="input"
        />
        <input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="Categoria (ex: Abertura)"
          maxLength={40}
          className="input"
        />
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Texto que será inserido no chat"
          rows={2}
          maxLength={600}
          className="input sm:col-span-2"
        />
        <button
          onClick={add}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:col-span-2"
        >
          <Plus className="size-4" /> {saving ? "Adicionando…" : "Adicionar modelo"}
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!loading && items.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Você ainda não tem modelos. Adicione o primeiro acima.
          </p>
        )}
        {items.map((t) => (
          <div key={t.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {t.label}
                <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-normal text-primary">
                  {t.category}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.body}</p>
            </div>
            <button
              onClick={() => remove(t.id)}
              aria-label={`Remover ${t.label}`}
              className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
