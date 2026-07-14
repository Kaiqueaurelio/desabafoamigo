import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { libraryMediaUrl } from "@/lib/library";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { BreathingButton } from "@/components/BreathingExercise";
import {
  BookOpen, Wind, HeartPulse, Sun, Users, PhoneCall,
  Headphones, Quote, ImageIcon, Sparkles, ArrowRight, Play, ChevronRight,
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

type BlockTone = "sky" | "blue" | "amber" | "emerald" | "rose";
const BLOCKS: { id: string; label: string; icon: typeof Sparkles; desc: string; tone: BlockTone }[] = [
  { id: "tecnicas", label: "Técnicas", icon: Sparkles, desc: "Respire e se acalme", tone: "sky" },
  { id: "audios", label: "Áudios", icon: Headphones, desc: "Sons e meditações", tone: "blue" },
  { id: "frases", label: "Frases", icon: Quote, desc: "Acolhimento em palavras", tone: "amber" },
  { id: "imagens", label: "Imagens", icon: ImageIcon, desc: "Visuais para relaxar", tone: "emerald" },
  { id: "emergencia", label: "Emergência", icon: PhoneCall, desc: "Ajuda urgente", tone: "rose" },
];

const TONE_ICON: Record<BlockTone, string> = {
  sky: "bg-sky-500/10 text-sky-300",
  blue: "bg-blue-500/10 text-blue-300",
  amber: "bg-amber-500/10 text-amber-300",
  emerald: "bg-emerald-500/10 text-emerald-300",
  rose: "bg-rose-500/10 text-rose-300",
};

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
    <div className="relative min-h-full w-full max-w-full overflow-x-clip bg-gradient-to-b from-background via-background to-[#0a0f1c]">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-72 bg-[radial-gradient(60%_60%_at_50%_0%,theme(colors.blue.500/12),transparent_70%)]" />

      <div className="relative mx-auto w-full max-w-5xl overflow-x-clip px-4 py-6 sm:px-6 sm:py-12">
        {/* Hero — compacto em mobile */}
        <header className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0 rounded-2xl border border-blue-500/25 bg-blue-500/10 p-2.5 shadow-[0_0_40px_-10px_theme(colors.blue.500/40)] sm:p-3">
            <BookOpen className="size-6 text-blue-300 sm:size-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">Central de Apoio</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-lg">
              Tudo em um só lugar para te acolher agora.
            </p>
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="mt-6 w-full max-w-full overflow-x-clip sm:mt-10">
          {/* Mobile: grade fixa para não gerar rolagem lateral. Desktop: grid glass. */}
          <div className="grid w-full max-w-full grid-cols-2 gap-2 pb-2 sm:grid-cols-3 sm:gap-4 sm:pb-0 md:grid-cols-5">
            {BLOCKS.map((b) => {
              const active = tab === b.id;
              const isEmergency = b.tone === "rose";
              const base =
                "group relative flex min-w-0 flex-col items-start rounded-2xl border p-3.5 text-left transition-all duration-200 sm:rounded-3xl sm:p-5";
              const inactive = isEmergency
                ? "border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/10"
                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] sm:hover:-translate-y-0.5";
              const activeCls = isEmergency
                ? "border-rose-500/50 bg-rose-500/15 shadow-[0_0_30px_-8px_theme(colors.rose.500/50)]"
                : "border-blue-500/40 bg-blue-500/15 shadow-[0_0_30px_-8px_theme(colors.blue.500/50)] ring-1 ring-blue-500/30";
              return (
                <button
                  key={b.id}
                  onClick={() => setTab(b.id)}
                  aria-pressed={active}
                  className={`${base} ${active ? activeCls : inactive}`}
                >
                  <span
                    className={`mb-2.5 grid size-9 place-items-center rounded-xl transition-transform group-hover:scale-110 sm:mb-4 sm:size-10 ${
                      active
                        ? isEmergency
                          ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30"
                          : "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                        : TONE_ICON[b.tone]
                    }`}
                  >
                    <b.icon className="size-4 sm:size-5" />
                  </span>
                  <span
                    className={`text-sm font-semibold sm:text-base ${
                      active && isEmergency ? "text-rose-100" : active ? "text-white" : isEmergency ? "text-rose-200" : "text-foreground"
                    }`}
                  >
                    {b.label}
                  </span>
                  <span
                    className={`mt-0.5 line-clamp-2 text-[11px] leading-snug sm:mt-1 sm:text-xs ${
                      active && !isEmergency ? "text-blue-200" : isEmergency ? "text-rose-400/80" : "text-muted-foreground"
                    }`}
                  >
                    {b.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TÉCNICAS */}
          <TabsContent value="tecnicas" className="mt-6 focus-visible:ring-0 sm:mt-10">
            <Link
              to="/respirar"
              className="group block rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/15 via-blue-500/10 to-transparent p-4 transition hover:border-sky-400/60 sm:rounded-3xl sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-sky-500/20 text-sky-300 sm:size-12">
                    <Wind className="size-5 sm:size-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground sm:text-lg">Respiração guiada</p>
                    <p className="text-xs text-muted-foreground sm:text-sm">Sessões de 1, 5 ou 10 minutos com círculo que respira junto.</p>
                  </div>
                </div>
                <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition group-hover:bg-sky-400 sm:w-auto">
                  <Play className="size-4" /> Começar agora
                </span>
              </div>
            </Link>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:rounded-3xl sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Só uma pausa rápida?</p>
                  <p className="text-xs text-muted-foreground">Abre um mini-exercício 4-7-8 sem sair da tela.</p>
                </div>
                <BreathingButton />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
              {TIPS.map((t) => (
                <article key={t.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07] sm:rounded-3xl sm:p-6">
                  <div className="mb-3 grid size-10 place-items-center rounded-xl bg-sky-500/10 text-sky-300 sm:mb-4 sm:size-11">
                    <t.icon className="size-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{t.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
                </article>
              ))}
            </div>
          </TabsContent>

          {/* ÁUDIOS */}
          <TabsContent value="audios" className="mt-6 focus-visible:ring-0 sm:mt-10">
            <SectionHeader title="Áudios para relaxar" to="/relaxar" cta="Abrir player completo" />
            {audios.length === 0 ? (
              <EmptyMsg text="Em breve teremos novos áudios por aqui." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {audios.map((a) => (
                  <Link
                    key={a.id}
                    to="/relaxar"
                    className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition-all hover:border-white/20 hover:bg-white/[0.08] sm:gap-4 sm:p-4"
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-500/20 text-blue-300 transition-colors group-hover:bg-blue-500 group-hover:text-white sm:size-12">
                      <Play className="ml-0.5 size-5 fill-current" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-medium text-foreground sm:text-base">{a.title}</h3>
                      <p className="mt-0.5 truncate text-xs capitalize text-muted-foreground">{a.category}</p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* FRASES */}
          <TabsContent value="frases" className="mt-6 focus-visible:ring-0 sm:mt-10">
            <SectionHeader title="Frases de acolhimento" />
            {phrases.length === 0 ? (
              <EmptyMsg text="Novas frases estão chegando." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {phrases.map((p) => (
                  <blockquote
                    key={p.id}
                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/[0.08] via-white/[0.03] to-transparent p-4 sm:rounded-3xl sm:p-6"
                  >
                    <Quote className="mb-2 size-5 text-amber-300/80 sm:mb-3 sm:size-6" />
                    <p className="text-sm leading-relaxed text-foreground sm:text-base">"{p.text}"</p>
                    {p.author && <footer className="mt-2 text-xs text-muted-foreground sm:mt-3">— {p.author}</footer>}
                  </blockquote>
                ))}
              </div>
            )}
          </TabsContent>

          {/* IMAGENS */}
          <TabsContent value="imagens" className="mt-6 focus-visible:ring-0 sm:mt-10">
            <SectionHeader title="Imagens para se acalmar" />
            {images.length === 0 ? (
              <EmptyMsg text="Novas imagens em breve." />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {images.map((im) => (
                  <figure key={im.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-white/20">
                    {imgUrls[im.id] ? (
                      <img src={imgUrls[im.id]} alt={im.title} loading="lazy" className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="aspect-square w-full animate-pulse bg-white/5" />
                    )}
                    <figcaption className="p-2.5 sm:p-3">
                      <p className="truncate text-sm font-medium text-foreground">{im.title}</p>
                      {im.caption && <p className="truncate text-xs text-muted-foreground">{im.caption}</p>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </TabsContent>

          {/* EMERGÊNCIA — botão de ligar full-width em mobile */}
          <TabsContent value="emergencia" className="mt-6 focus-visible:ring-0 sm:mt-10">
            <SectionHeader title="Se você precisa de ajuda urgente" />
            <div className="space-y-3">
              {CONTACTS.map((c) => (
                <div
                  key={c.name}
                  className="flex flex-col gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                  <a
                    href={`tel:${c.phone}`}
                    aria-label={`Ligar para ${c.name} no número ${c.phone}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 transition hover:bg-rose-500 active:scale-95 sm:w-auto sm:py-2.5"
                  >
                    <PhoneCall className="size-4" /> Ligar {c.phone}
                  </a>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-muted-foreground sm:mt-12">
          Os conteúdos desta página são informativos e não substituem atendimento profissional de saúde.
        </p>
      </div>
    </div>
  );
}

function SectionHeader({ title, to, cta }: { title: string; to?: "/relaxar"; cta?: string }) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <h2 className="min-w-0 text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      {to && cta && (
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
        >
          {cta} <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
