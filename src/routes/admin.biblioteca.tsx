import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import {
  uploadLibraryFile,
  removeLibraryFile,
  AUDIO_CATEGORIES,
  PHRASE_CATEGORIES,
  IMAGE_CATEGORIES,
} from "@/lib/library";
import { autofillLibraryMedia } from "@/lib/libraryAutofill.functions";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Search,
  Music,
  Quote,
  ImageIcon,
  X,
  Sparkles,
  Pencil,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";



export const Route = createFileRoute("/admin/biblioteca")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAdminAal2();
  },
  component: BibliotecaAdmin,
});

type Tab = "audios" | "frases" | "imagens";

type BulkStatus = "pending" | "uploading" | "analyzing" | "saving" | "saved" | "error";
type BulkItem = {
  id: string;
  file: File;
  status: BulkStatus;
  title: string;
  category: string;
  description: string;
  error?: string;
};


type Audio = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
  published: boolean;
};
type Phrase = { id: string; text: string; author: string | null; category: string; published: boolean };
type Image = { id: string; title: string; caption: string | null; image_url: string; category: string; published: boolean };

const TAB_META: { id: Tab; label: string; icon: typeof Music; hint: string }[] = [
  { id: "audios", label: "Áudios", icon: Music, hint: "ASMR, meditações e sons calmantes" },
  { id: "frases", label: "Frases", icon: Quote, hint: "Mensagens de acolhimento e autoajuda" },
  { id: "imagens", label: "Imagens", icon: ImageIcon, hint: "Fotos e ilustrações de conforto" },
];

function BibliotecaAdmin() {
  const [tab, setTab] = useState<Tab>("audios");
  const [counts, setCounts] = useState<Record<Tab, number>>({ audios: 0, frases: 0, imagens: 0 });

  useEffect(() => {
    (async () => {
      const [a, p, i] = await Promise.all([
        supabase.from("library_audios").select("id", { count: "exact", head: true }),
        supabase.from("library_phrases").select("id", { count: "exact", head: true }),
        supabase.from("library_images").select("id", { count: "exact", head: true }),
      ]);
      setCounts({ audios: a.count ?? 0, frases: p.count ?? 0, imagens: i.count ?? 0 });
    })();
  }, [tab]);

  const active = TAB_META.find((t) => t.id === tab)!;

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
        {/* Intro */}
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-foreground">Conteúdos de acolhimento</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os áudios, frases e imagens que aparecem para as pessoas na sala de relaxamento.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1.5">
          {TAB_META.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-pressed={isActive}
              >
                <Icon className="size-4" />
                <span className="flex items-baseline gap-1.5">
                  {t.label}
                  <span className={`text-xs font-normal ${isActive ? "opacity-80" : "opacity-60"}`}>
                    {counts[t.id]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mb-4 text-xs text-muted-foreground">{active.hint}</p>

        {tab === "audios" && <AudiosManager />}
        {tab === "frases" && <PhrasesManager />}
        {tab === "imagens" && <ImagesManager />}
      </div>
    </main>
  );
}

/* ---------- Reusable pieces ---------- */

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</div>;
}

function Field({ label, children, full, hint }: { label: string; children: React.ReactNode; full?: boolean; hint?: string }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9"
      />
    </div>
  );
}

function AddToggle({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      className="btn-primary inline-flex items-center gap-2 !px-4 !py-2.5 text-sm"
    >
      {open ? <X className="size-4" /> : <Plus className="size-4" />}
      {open ? "Cancelar" : label}
    </button>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: typeof Music; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
      <Icon className="mb-2 size-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/* ---------- Áudios ---------- */

function AudiosManager() {
  const [rows, setRows] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Audio | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "asmr",
    audio_url: "",
    cover_url: "",
    duration_seconds: "",
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>("asmr");

  function addBulkFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const next: BulkItem[] = Array.from(files).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: "pending",
      title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      category: bulkCategory,
      description: "",
    }));
    setBulkItems((prev) => [...prev, ...next]);
  }

  function updateBulk(id: string, patch: Partial<BulkItem>) {
    setBulkItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function runBulk(withAi: boolean) {
    if (!bulkItems.length) return;
    setBulkRunning(true);
    const t = toast.loading(withAi ? "Enviando e analisando com IA…" : "Enviando arquivos…");
    let ok = 0;
    let fail = 0;
    for (const item of bulkItems) {
      if (item.status === "saved") continue;
      try {
        updateBulk(item.id, { status: "uploading", error: undefined });
        const path = await uploadLibraryFile(item.file, "audio");
        let title = item.title;
        let category = item.category;
        let description = item.description;
        if (withAi) {
          updateBulk(item.id, { status: "analyzing" });
          try {
            const r = await autofillLibraryMedia({
              data: { kind: "audio", storagePath: path, filename: item.file.name },
            });
            title = r.title || title;
            category = r.category || category;
            description = r.description || description;
          } catch {
            /* segue com metadados manuais */
          }
        }
        updateBulk(item.id, { status: "saving", title, category, description });
        const { error } = await supabase.from("library_audios").insert({
          title: (title || item.file.name).trim(),
          description: description?.trim() || null,
          category,
          audio_url: path,
        });
        if (error) throw error;
        updateBulk(item.id, { status: "saved" });
        ok++;
      } catch (e) {
        fail++;
        updateBulk(item.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Falha",
        });
      }
    }
    setBulkRunning(false);
    toast.success(`Concluído: ${ok} salvos${fail ? `, ${fail} com erro` : ""}.`, { id: t });
    await load();
  }


  async function aiFill() {
    if (!audioFile && !form.audio_url) return toast.error("Selecione o arquivo de áudio antes.");
    setAiLoading(true);
    const t = toast.loading("Analisando áudio com IA…");
    try {
      let path = form.audio_url;
      let filename = "";
      if (audioFile) {
        path = await uploadLibraryFile(audioFile, "audio");
        filename = audioFile.name;
        setForm((f) => ({ ...f, audio_url: path }));
        setAudioFile(null);
      }
      if (/^https?:\/\//i.test(path)) throw new Error("IA só funciona com upload direto, não URL externa.");
      const r = await autofillLibraryMedia({
        data: { kind: "audio", storagePath: path, filename },
      });
      setForm((f) => ({
        ...f,
        title: f.title || r.title,
        description: f.description || r.description,
        category: r.category || f.category,
      }));
      toast.success("Sugestões preenchidas!", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na IA", { id: t });
    } finally {
      setAiLoading(false);
    }
  }


  async function load() {
    setLoading(true);
    const { data } = await supabase.from("library_audios").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Audio[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => (q ? r.title.toLowerCase().includes(q.toLowerCase()) : true)),
    [rows, q]
  );

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
      setAudioFile(null);
      setCoverFile(null);
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar áudio.");
    } finally {
      setBusy(false);
    }
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:flex-1 sm:max-w-sm">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar áudios pelo título…" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-sm font-medium text-foreground hover:bg-background/60"
          >
            <Upload className="size-4" />
            {bulkOpen ? "Fechar envio em lote" : "Envio em lote"}
          </button>
          <AddToggle open={open} onToggle={() => setOpen((o) => !o)} label="Novo áudio" />
        </div>
      </div>

      {bulkOpen && (
        <SectionCard>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Envio em lote com IA</h3>
              <p className="text-xs text-muted-foreground">
                Selecione vários arquivos. A IA transcreve, sugere título, categoria e descrição de cada um.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Categoria padrão</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value)}
                className="input !py-1.5 !text-xs"
              >
                {AUDIO_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-background/30 p-6 text-center transition hover:bg-background/50">
            <Upload className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Clique para escolher vários áudios
            </span>
            <span className="text-xs text-muted-foreground">mp3, m4a, wav — quantos quiser</span>
            <input
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addBulkFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>

          {bulkItems.length > 0 && (
            <>
              <ul className="mt-4 space-y-2">
                {bulkItems.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {it.status === "saved" ? (
                        <span className="text-lg">✓</span>
                      ) : it.status === "error" ? (
                        <X className="size-4 text-destructive" />
                      ) : it.status === "pending" ? (
                        <Music className="size-4 text-muted-foreground" />
                      ) : (
                        <Loader2 className="size-4 animate-spin text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{it.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {it.file.name} · {(it.file.size / 1024 / 1024).toFixed(1)} MB
                        {" · "}
                        {it.status === "pending" && "Aguardando"}
                        {it.status === "uploading" && "Enviando…"}
                        {it.status === "analyzing" && "Analisando com IA…"}
                        {it.status === "saving" && "Salvando…"}
                        {it.status === "saved" && `Salvo · ${AUDIO_CATEGORIES.find((c) => c.id === it.category)?.label ?? it.category}`}
                        {it.status === "error" && (it.error || "Erro")}
                      </p>
                    </div>
                    {it.status !== "saved" && !bulkRunning && (
                      <button
                        type="button"
                        onClick={() => setBulkItems((prev) => prev.filter((x) => x.id !== it.id))}
                        className="rounded-md p-1 text-muted-foreground hover:bg-background/60 hover:text-foreground"
                        aria-label="Remover da fila"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={bulkRunning}
                  onClick={() => setBulkItems([])}
                  className="rounded-lg border border-border/60 px-3 py-2 text-sm text-muted-foreground hover:bg-background/40 disabled:opacity-50"
                >
                  Limpar fila
                </button>
                <button
                  type="button"
                  disabled={bulkRunning || bulkItems.every((it) => it.status === "saved")}
                  onClick={() => runBulk(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-4 py-2 text-sm font-medium text-foreground hover:bg-background/60 disabled:opacity-50"
                >
                  {bulkRunning ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Enviar sem IA
                </button>
                <button
                  type="button"
                  disabled={bulkRunning || bulkItems.every((it) => it.status === "saved")}
                  onClick={() => runBulk(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {bulkRunning ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Enviar tudo com IA
                </button>
              </div>
            </>
          )}
        </SectionCard>
      )}


      {open && (
        <SectionCard>
          <form onSubmit={add}>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Adicionar áudio</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Título">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input"
                  placeholder="Ex: Respiração guiada 5 min"
                />
              </Field>
              <Field label="Categoria">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input"
                >
                  {AUDIO_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Descrição" full hint="Um resumo curto que aparece junto ao áudio.">
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Arquivo de áudio" hint="mp3, m4a ou wav. Ou cole uma URL abaixo.">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                  className="input !py-2"
                />
                <input
                  value={form.audio_url}
                  onChange={(e) => setForm({ ...form, audio_url: e.target.value })}
                  placeholder="https://…"
                  className="input mt-2"
                />
              </Field>
              <Field label="Capa (opcional)" hint="Imagem quadrada de fundo. Ou cole uma URL.">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                  className="input !py-2"
                />
                <input
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  placeholder="https://…"
                  className="input mt-2"
                />
              </Field>
              <Field label="Duração (segundos)" hint="Opcional. Ex: 300 para 5 minutos.">
                <input
                  type="number"
                  min={0}
                  value={form.duration_seconds}
                  onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })}
                  className="input"
                />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={aiFill}
                disabled={aiLoading || busy}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Preencher com IA
              </button>
              <button disabled={busy || aiLoading} className="btn-primary inline-flex items-center gap-2">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Salvar áudio
              </button>
            </div>

          </form>
        </SectionCard>
      )}

      <SectionCard>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Music}
            title={rows.length === 0 ? "Nenhum áudio ainda" : "Nada encontrado"}
            hint={
              rows.length === 0
                ? "Adicione o primeiro áudio para aparecer na sala de relaxamento."
                : "Tente outra palavra na busca."
            }
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3"
              >
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {r.cover_url ? (
                    <img src={r.cover_url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Music className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {AUDIO_CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category}
                    {r.duration_seconds ? ` · ${Math.round(r.duration_seconds / 60)} min` : ""}
                    {!r.published && " · rascunho"}
                  </p>
                </div>
                <RowActions published={r.published} onToggle={() => togglePublished(r)} onRemove={() => remove(r)} onEdit={() => setEditing(r)} />

              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

/* ---------- Frases ---------- */

function PhrasesManager() {
  const [rows, setRows] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ text: "", author: "", category: "acolhimento" });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState<Phrase | null>(null);


  async function aiFill() {
    if (!form.text.trim()) return toast.error("Escreva a frase antes.");
    setAiLoading(true);
    const t = toast.loading("Classificando com IA…");
    try {
      const r = await autofillLibraryMedia({
        data: { kind: "phrase", phraseText: form.text },
      });
      setForm((f) => ({
        ...f,
        category: r.category || f.category,
        author: f.author || r.author,
      }));
      toast.success("Categoria sugerida!", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na IA", { id: t });
    } finally {
      setAiLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("library_phrases").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Phrase[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => (q ? r.text.toLowerCase().includes(q.toLowerCase()) : true)),
    [rows, q]
  );

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
    setOpen(false);
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:flex-1 sm:max-w-sm">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar frases…" />
        </div>
        <AddToggle open={open} onToggle={() => setOpen((o) => !o)} label="Nova frase" />
      </div>

      {open && (
        <SectionCard>
          <form onSubmit={add}>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Adicionar frase</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Frase" full>
                <textarea
                  required
                  rows={3}
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  className="input"
                  placeholder="Ex: Você não precisa carregar tudo sozinho hoje."
                />
              </Field>
              <Field label="Autor (opcional)">
                <input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="input"
                  placeholder="Nome do autor"
                />
              </Field>
              <Field label="Categoria">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input"
                >
                  {PHRASE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={aiFill}
                disabled={aiLoading || busy}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Classificar com IA
              </button>
              <button disabled={busy || aiLoading} className="btn-primary inline-flex items-center gap-2">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Salvar frase
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Quote}
            title={rows.length === 0 ? "Nenhuma frase ainda" : "Nada encontrado"}
            hint={
              rows.length === 0
                ? "Cadastre a primeira mensagem de acolhimento."
                : "Tente outra palavra na busca."
            }
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-4"
              >
                <Quote className="mt-0.5 size-4 shrink-0 text-primary/70" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{r.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {PHRASE_CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category}
                    {r.author ? ` · ${r.author}` : ""}
                    {!r.published && " · rascunho"}
                  </p>
                </div>
                <RowActions published={r.published} onToggle={() => togglePublished(r)} onRemove={() => remove(r)} onEdit={() => setEditing(r)} />

              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

/* ---------- Imagens ---------- */

function ImagesManager() {
  const [rows, setRows] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", caption: "", image_url: "", category: "acolhimento" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [editing, setEditing] = useState<Image | null>(null);


  async function aiFill() {
    if (!file && !form.image_url) return toast.error("Selecione a imagem antes.");
    setAiLoading(true);
    const t = toast.loading("Analisando imagem com IA…");
    try {
      let path = form.image_url;
      let filename = "";
      if (file) {
        path = await uploadLibraryFile(file, "image");
        filename = file.name;
        setForm((f) => ({ ...f, image_url: path }));
        setFile(null);
      }
      if (/^https?:\/\//i.test(path)) throw new Error("IA só funciona com upload direto, não URL externa.");
      const r = await autofillLibraryMedia({
        data: { kind: "image", storagePath: path, filename },
      });
      setForm((f) => ({
        ...f,
        title: f.title || r.title,
        caption: f.caption || r.description,
        category: r.category || f.category,
      }));
      toast.success("Sugestões preenchidas!", { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na IA", { id: t });
    } finally {
      setAiLoading(false);
    }
  }


  async function load() {
    setLoading(true);
    const { data } = await supabase.from("library_images").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Image[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r) => (q ? r.title.toLowerCase().includes(q.toLowerCase()) : true)),
    [rows, q]
  );

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
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao adicionar.");
    } finally {
      setBusy(false);
    }
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="sm:flex-1 sm:max-w-sm">
          <SearchBar value={q} onChange={setQ} placeholder="Buscar imagens…" />
        </div>
        <AddToggle open={open} onToggle={() => setOpen((o) => !o)} label="Nova imagem" />
      </div>

      {open && (
        <SectionCard>
          <form onSubmit={add}>
            <h3 className="mb-4 text-sm font-semibold text-foreground">Adicionar imagem</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Título">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input"
                  placeholder="Ex: Amanhecer suave"
                />
              </Field>
              <Field label="Categoria">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input"
                >
                  {IMAGE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Legenda (opcional)" full>
                <input
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Arquivo" full hint="jpg, png ou webp. Ou cole uma URL.">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="input !py-2"
                />
                <input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://…"
                  className="input mt-2"
                />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={aiFill}
                disabled={aiLoading || busy}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Preencher com IA
              </button>
              <button disabled={busy || aiLoading} className="btn-primary inline-flex items-center gap-2">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Salvar imagem
              </button>
            </div>

          </form>
        </SectionCard>
      )}

      <SectionCard>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title={rows.length === 0 ? "Nenhuma imagem ainda" : "Nada encontrado"}
            hint={
              rows.length === 0
                ? "Adicione a primeira imagem de acolhimento."
                : "Tente outra palavra na busca."
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <li key={r.id} className="overflow-hidden rounded-xl border border-border/60 bg-background/40">
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img src={r.image_url} alt={r.title} className="size-full object-cover" />
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {IMAGE_CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category}
                      {!r.published && " · rascunho"}
                    </p>
                  </div>
                  <RowActions published={r.published} onToggle={() => togglePublished(r)} onRemove={() => remove(r)} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

/* ---------- Row actions ---------- */

function RowActions({
  published,
  onToggle,
  onRemove,
  onEdit,
}: {
  published: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {onEdit && (
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Editar"
          aria-label="Editar"
        >
          <Pencil className="size-4" />
        </button>
      )}
      <button
        onClick={onToggle}
        className={`rounded-lg p-2 transition ${
          published
            ? "text-primary hover:bg-primary/10"
            : "text-muted-foreground hover:bg-muted"
        }`}
        title={published ? "Publicado — clique para ocultar" : "Rascunho — clique para publicar"}
        aria-label={published ? "Ocultar" : "Publicar"}
      >
        {published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </button>
      <button
        onClick={onRemove}
        className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
        title="Remover"
        aria-label="Remover"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/* ---------- Edit dialogs ---------- */

function EditAudioDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Audio | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "asmr",
    cover_url: "",
    duration_seconds: "",
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) {
      setForm({
        title: row.title,
        description: row.description ?? "",
        category: row.category,
        cover_url: row.cover_url ?? "",
        duration_seconds: row.duration_seconds != null ? String(row.duration_seconds) : "",
      });
      setCoverFile(null);
    }
  }, [row]);

  async function save() {
    if (!row) return;
    if (!form.title.trim()) return toast.error("Título é obrigatório.");
    setBusy(true);
    try {
      let cover_url = form.cover_url.trim();
      if (coverFile) {
        // sobrescrever capa: remove antiga se veio do storage e faz upload
        if (row.cover_url) await removeLibraryFile(row.cover_url).catch(() => {});
        cover_url = await uploadLibraryFile(coverFile, "image");
      }
      const { error } = await supabase
        .from("library_audios")
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          cover_url: cover_url || null,
          duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
        })
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Áudio atualizado.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar áudio</DialogTitle>
          <DialogDescription>Atualize os metadados. O arquivo de áudio permanece o mesmo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Título">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </Field>
          <Field label="Descrição">
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                {AUDIO_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Duração (segundos)">
              <input type="number" min={0} value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} className="input" />
            </Field>
          </div>
          <Field label="Capa (opcional)" hint="Envie uma nova imagem para substituir a atual.">
            <div className="flex items-center gap-3">
              {(coverFile || form.cover_url) && (
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <img
                    alt=""
                    className="size-full object-cover"
                    src={coverFile ? URL.createObjectURL(coverFile) : form.cover_url}
                  />
                </div>
              )}
              <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="input" />
              {form.cover_url && !coverFile && (
                <button type="button" onClick={() => setForm({ ...form, cover_url: "" })} className="text-xs text-destructive hover:underline">
                  Remover
                </button>
              )}
            </div>
          </Field>
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
          <button type="button" onClick={save} disabled={busy} className="btn-primary inline-flex items-center gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditPhraseDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Phrase | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ text: "", author: "", category: "acolhimento" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) setForm({ text: row.text, author: row.author ?? "", category: row.category });
  }, [row]);

  async function save() {
    if (!row) return;
    if (!form.text.trim()) return toast.error("Escreva a frase.");
    setBusy(true);
    const { error } = await supabase
      .from("library_phrases")
      .update({
        text: form.text.trim(),
        author: form.author.trim() || null,
        category: form.category,
      })
      .eq("id", row.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Frase atualizada.");
    onSaved();
    onClose();
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar frase</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Frase">
            <textarea rows={3} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Autor (opcional)">
              <input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="input" />
            </Field>
            <Field label="Categoria">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                {PHRASE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
          <button type="button" onClick={save} disabled={busy} className="btn-primary inline-flex items-center gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditImageDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Image | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ title: "", caption: "", category: "acolhimento", image_url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) {
      setForm({ title: row.title, caption: row.caption ?? "", category: row.category, image_url: row.image_url });
      setFile(null);
    }
  }, [row]);

  async function save() {
    if (!row) return;
    if (!form.title.trim()) return toast.error("Título é obrigatório.");
    setBusy(true);
    try {
      let image_url = form.image_url;
      if (file) {
        if (row.image_url) await removeLibraryFile(row.image_url).catch(() => {});
        image_url = await uploadLibraryFile(file, "image");
      }
      const { error } = await supabase
        .from("library_images")
        .update({
          title: form.title.trim(),
          caption: form.caption.trim() || null,
          category: form.category,
          image_url,
        })
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Imagem atualizada.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar imagem</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {(file || form.image_url) && (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <img alt="" className="size-full object-cover" src={file ? URL.createObjectURL(file) : form.image_url} />
            </div>
          )}
          <Field label="Título">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" />
          </Field>
          <Field label="Legenda">
            <textarea rows={2} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="input" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                {IMAGE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Substituir imagem">
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input" />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
          <button type="button" onClick={save} disabled={busy} className="btn-primary inline-flex items-center gap-2">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

