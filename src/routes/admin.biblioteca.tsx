import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { uploadLibraryFile, removeLibraryFile, AUDIO_CATEGORIES, PHRASE_CATEGORIES, IMAGE_CATEGORIES } from "@/lib/library";
import { ArrowLeft, Loader2, Plus, Trash2, Eye, EyeOff, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/biblioteca")({
  ssr: false,
  beforeLoad: async () => { await ensureAdminAal2(); },
  component: BibliotecaAdmin,
});

type Tab = "audios" | "frases" | "imagens";

type Audio = { id: string; title: string; description: string | null; category: string; audio_url: string; cover_url: string | null; duration_seconds: number | null; published: boolean };
type Phrase = { id: string; text: string; author: string | null; category: string; published: boolean };
type Image = { id: string; title: string; caption: string | null; image_url: string; category: string; published: boolean };

function BibliotecaAdmin() {
  const [tab, setTab] = useState<Tab>("audios");
  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-semibold text-primary">Biblioteca de acolhimento</span>
          </div>
          <Link to="/admin" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex gap-2">
          {(["audios", "frases", "imagens"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >{t === "audios" ? "Áudios" : t === "frases" ? "Frases" : "Imagens"}</button>
          ))}
        </div>

        {tab === "audios" && <AudiosManager />}
        {tab === "frases" && <PhrasesManager />}
        {tab === "imagens" && <ImagesManager />}
      </div>
    </main>
  );
}

function AudiosManager() {
  const [rows, setRows] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "asmr", audio_url: "", cover_url: "", duration_seconds: "" });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("library_audios").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Audio[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Título é obrigatório.");
    setBusy(true);
    try {
      let audio_url = form.audio_url.trim();
      let cover_url = form.cover_url.trim();
      if (audioFile) audio_url = await uploadLibraryFile(audioFile, "audio");
      if (coverFile) cover_url = await uploadLibraryFile(coverFile, "image");
      if (!audio_url) throw new Error("Envie um arquivo de áudio ou informe uma URL.");
      const { error } = await supabase.from("library_audios").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        audio_url,
        cover_url: cover_url || null,
        duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
      });
      if (error) throw error;
      toast.success("Áudio adicionado.");
      setForm({ title: "", description: "", category: "asmr", audio_url: "", cover_url: "", duration_seconds: "" });
      setAudioFile(null); setCoverFile(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar áudio.");
    } finally { setBusy(false); }
  }

  async function togglePublished(row: Audio) {
    await supabase.from("library_audios").update({ published: !row.published }).eq("id", row.id);
    load();
  }
  async function remove(row: Audio) {
    if (!confirm(`Remover "${row.title}"?`)) return;
    await removeLibraryFile(row.audio_url);
    if (row.cover_url) await removeLibraryFile(row.cover_url);
    await supabase.from("library_audios").delete().eq("id", row.id);
    load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Plus className="size-4" /> Novo áudio</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Título"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>
          <Field label="Categoria">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
              {AUDIO_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Descrição (opcional)" full>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </Field>
          <Field label="Áudio (mp3, m4a, wav)">
            <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} className="text-xs" />
            <p className="mt-1 text-[11px] text-muted-foreground">ou cole uma URL:</p>
            <input value={form.audio_url} onChange={(e) => setForm({ ...form, audio_url: e.target.value })} placeholder="https://..." className="input mt-1" />
          </Field>
          <Field label="Capa (opcional)">
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="text-xs" />
            <p className="mt-1 text-[11px] text-muted-foreground">ou cole uma URL:</p>
            <input value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} placeholder="https://..." className="input mt-1" />
          </Field>
          <Field label="Duração (segundos, opcional)"><input type="number" min={0} value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} className="input" /></Field>
        </div>
        <button disabled={busy} className="btn-primary mt-4 inline-flex items-center gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Adicionar áudio
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Áudios cadastrados ({rows.length})</h3>
        {loading ? <Loader2 className="size-5 animate-spin text-primary" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum áudio cadastrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{AUDIO_CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePublished(r)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" title={r.published ? "Ocultar" : "Publicar"}>
                    {r.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button onClick={() => remove(r)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" title="Remover">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PhrasesManager() {
  const [rows, setRows] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ text: "", author: "", category: "acolhimento" });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("library_phrases").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Phrase[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("library_phrases").insert({
      text: form.text.trim(),
      author: form.author.trim() || null,
      category: form.category,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setForm({ text: "", author: "", category: "acolhimento" });
    toast.success("Frase adicionada.");
    load();
  }
  async function togglePublished(row: Phrase) {
    await supabase.from("library_phrases").update({ published: !row.published }).eq("id", row.id);
    load();
  }
  async function remove(row: Phrase) {
    if (!confirm("Remover esta frase?")) return;
    await supabase.from("library_phrases").delete().eq("id", row.id);
    load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Plus className="size-4" /> Nova frase</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Frase" full>
            <textarea required rows={2} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="input" />
          </Field>
          <Field label="Autor (opcional)"><input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="input" /></Field>
          <Field label="Categoria">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
              {PHRASE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
        </div>
        <button disabled={busy} className="btn-primary mt-4 inline-flex items-center gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Adicionar frase
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Frases ({rows.length})</h3>
        {loading ? <Loader2 className="size-5 animate-spin text-primary" /> : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{r.text}</p>
                  <p className="text-xs text-muted-foreground">{PHRASE_CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category}{r.author ? ` · ${r.author}` : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => togglePublished(r)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                    {r.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button onClick={() => remove(r)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ImagesManager() {
  const [rows, setRows] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", caption: "", image_url: "", category: "acolhimento" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("library_images").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Image[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Título é obrigatório.");
    setBusy(true);
    try {
      let image_url = form.image_url.trim();
      if (file) image_url = await uploadLibraryFile(file, "image");
      if (!image_url) throw new Error("Envie uma imagem ou informe uma URL.");
      const { error } = await supabase.from("library_images").insert({
        title: form.title.trim(),
        caption: form.caption.trim() || null,
        category: form.category,
        image_url,
      });
      if (error) throw error;
      toast.success("Imagem adicionada.");
      setForm({ title: "", caption: "", image_url: "", category: "acolhimento" });
      setFile(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally { setBusy(false); }
  }
  async function togglePublished(row: Image) {
    await supabase.from("library_images").update({ published: !row.published }).eq("id", row.id);
    load();
  }
  async function remove(row: Image) {
    if (!confirm(`Remover "${row.title}"?`)) return;
    await removeLibraryFile(row.image_url);
    await supabase.from("library_images").delete().eq("id", row.id);
    load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Plus className="size-4" /> Nova imagem</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Título"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>
          <Field label="Categoria">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
              {IMAGE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Legenda (opcional)" full>
            <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="input" />
          </Field>
          <Field label="Arquivo">
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
            <p className="mt-1 text-[11px] text-muted-foreground">ou cole uma URL:</p>
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="input mt-1" />
          </Field>
        </div>
        <button disabled={busy} className="btn-primary mt-4 inline-flex items-center gap-2">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Adicionar imagem
        </button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Imagens ({rows.length})</h3>
        {loading ? <Loader2 className="size-5 animate-spin text-primary" /> : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{IMAGE_CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={() => togglePublished(r)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                    {r.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button onClick={() => remove(r)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-xs font-medium text-muted-foreground ${full ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
