import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { libraryMediaUrl } from "@/lib/library";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BreathingButton } from "@/components/BreathingExercise";
import {
  BookOpen, Wind, HeartPulse, Sun, Users, PhoneCall,
  Headphones, Quote, ImageIcon, Sparkles, ArrowRight, Play,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/apoio")({
  component: Apoio,
});

type Audio = { id: string; title: string; category: string; audio_url: string; cover_url: string | null };
type Phrase = { id: string; text: string; author: string | null; category: string };
type ImgRow = { id: string; title: string; caption: string | null; image_url: string };

const TIPS = [
  { icon: Wind, title: "Respiração 4-7-8", body: "Inspire 4s, segure 7s, solte 8s. Repita 4 ciclos." },
  { icon: HeartPulse, title: "Grounding 5-4-3-2-1", body: "5 coisas que vê, 4 que toca, 3 que ouve, 2 que cheira, 1 que sente." },
  { icon: Sun, title: "Autocuidado rápido", body: "Água, ar fresco e 10 min de movimento. Corpo cuidado, mente leve." },
  { icon: Users, title: "Rede de apoio", body: "Fale com alguém de confiança. Pedir ajuda é força." },
];

const CONTACTS = [
  { name: "CVV — Valorização da Vida", phone: "188", desc: "24h, gratuito e sigiloso." },
  { name: "SAMU", phone: "192", desc: "Emergências médicas." },
  { name: "Polícia Militar", phone: "190", desc: "Emergências gerais." },
  { name: "Disque 100", phone: "100", desc: "Direitos humanos e violência." },
];

const BLOCKS = [
  { id: "tecnicas", label: "Técnicas", icon: Sparkles, color: "from-primary/20 to-primary/5", desc: "Respire e se acalme" },
  { id: "audios", label: "Áudios", icon: Headphones, color: "from-blue-500/20 to-blue-500/5", desc: "Sons e meditações" },
  { id: "frases", label: "Frases", icon: Quote, color: "from-amber-500/20 to-amber-500/5", desc: "Acolhimento em palavras" },
  { id: "imagens", label: "Imagens", icon: ImageIcon, color: "from-emerald-500/20 to-emerald-500/5", desc: "Visuais para relaxar" },
  { id: "emergencia", label: "Emergência", icon: PhoneCall, color: "from-rose-500/20 to-rose-500/5", desc: "Ajuda urgente" },
] as const;

function Apoio() {
  const [tab, setTab] = useState<string>("tecnicas");
  const [audios, setAudios] = useState<Audio[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [images, setImages] = useState<ImgRow[]>([]);
  const [imgUrls, setImgUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const [a, p, i] = await Promise.all([
        supabase.from("library_audios").select("id,title,category,audio_url,cover_url").limit(6),
        supabase.from("library_phrases").select("id,text,author,category").limit(8),
        supabase.from("library_images").select("id,title,caption,image_url").limit(6),
      ]);
      setAudios((a.data ?? []) as Audio[]);
      setPhrases((p.data ?? []) as Phrase[]);
      setImages((i.data ?? []) as ImgRow[]);
      const urls: Record<string, string> = {};
      await Promise.all((i.data ?? []).map(async (row: ImgRow) => {
        const u = await libraryMediaUrl(row.image_url);
        if (u) urls[row.id] = u;
      }));
      setImgUrls(urls);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-primary">
          <BookOpen className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Central de Apoio</h1>
          <p className="text-sm text-muted-foreground">Tudo em um só lugar para te acolher agora.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        {/* Bloco de menu — grid de cards grandes */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5">
          {BLOCKS.map((b) => {
            const active = tab === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setTab(b.id)}
                aria-pressed={active}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-primary ring-2 ring-primary/30 shadow-md"
                    : "border-border hover:border-primary/40 hover:shadow-sm"
                } bg-gradient-to-br ${b.color}`}
              >
                <div className={`mb-2 grid size-9 place-items-center rounded-xl bg-background/80 text-primary`}>
                  <b.icon className="size-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">{b.label}</p>
                <p className="text-[11px] text-muted-foreground">{b.desc}</p>
              </button>
            );
          })}
        </div>

        {/* TabsList escondido — acessibilidade via botões acima */}
        <TabsList className="sr-only">
          {BLOCKS.map((b) => (<TabsTrigger key={b.id} value={b.id}>{b.label}</TabsTrigger>))}
        </TabsList>

        {/* Técnicas */}
        <TabsContent value="tecnicas" className="mt-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground">Precisa se acalmar agora?</p>
            <p className="mb-3 text-xs text-muted-foreground">Comece uma respiração guiada em poucos segundos.</p>
            <BreathingButton />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {TIPS.map((t) => (
              <article key={t.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-2 grid size-10 place-items-center rounded-xl bg-brand-soft text-primary">
                  <t.icon className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground">{t.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
              </article>
            ))}
          </div>
        </TabsContent>

        {/* Áudios */}
        <TabsContent value="audios" className="mt-6">
          <SectionHeader title="Áudios para relaxar" to="/relaxar" cta="Abrir player completo" />
          {audios.length === 0 ? (
            <EmptyMsg text="Em breve teremos novos áudios por aqui." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {audios.map((a) => (
                <Link
                  key={a.id}
                  to="/relaxar"
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40"
                >
                  <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 text-primary">
                    <Play className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground capitalize">{a.category}</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Frases */}
        <TabsContent value="frases" className="mt-6">
          <SectionHeader title="Frases de acolhimento" />
          {phrases.length === 0 ? (
            <EmptyMsg text="Novas frases estão chegando." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {phrases.map((p) => (
                <blockquote key={p.id} className="rounded-2xl border border-border bg-gradient-to-br from-amber-500/5 to-transparent p-5">
                  <Quote className="mb-2 size-5 text-amber-500/70" />
                  <p className="text-sm leading-relaxed text-foreground">"{p.text}"</p>
                  {p.author && <footer className="mt-2 text-xs text-muted-foreground">— {p.author}</footer>}
                </blockquote>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Imagens */}
        <TabsContent value="imagens" className="mt-6">
          <SectionHeader title="Imagens para se acalmar" />
          {images.length === 0 ? (
            <EmptyMsg text="Novas imagens em breve." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((im) => (
                <figure key={im.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  {imgUrls[im.id] ? (
                    <img src={imgUrls[im.id]} alt={im.title} loading="lazy" className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="aspect-square w-full animate-pulse bg-muted" />
                  )}
                  <figcaption className="p-2">
                    <p className="truncate text-xs font-medium text-foreground">{im.title}</p>
                    {im.caption && <p className="truncate text-[11px] text-muted-foreground">{im.caption}</p>}
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Emergência */}
        <TabsContent value="emergencia" className="mt-6">
          <SectionHeader title="Se você precisa de ajuda urgente" />
          <div className="space-y-2">
            {CONTACTS.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  <PhoneCall className="size-4" /> {c.phone}
                </a>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <p className="mt-10 rounded-2xl bg-brand-soft p-4 text-xs text-muted-foreground">
        Os conteúdos desta página são informativos e não substituem atendimento profissional de saúde.
      </p>
    </div>
  );
}

function SectionHeader({ title, to, cta }: { title: string; to?: "/relaxar"; cta?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {to && cta && (
        <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {cta} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
