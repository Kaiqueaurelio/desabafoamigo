import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { libraryMediaUrl, AUDIO_CATEGORIES, PHRASE_CATEGORIES, IMAGE_CATEGORIES } from "@/lib/library";
import { Headphones, Quote, ImageIcon, Play, Pause, Loader2, Volume2 } from "lucide-react";
import { BreathingButton } from "@/components/BreathingExercise";

export const Route = createFileRoute("/_authenticated/relaxar")({
  component: RelaxarPage,
});

type Audio = { id: string; title: string; description: string | null; category: string; audio_url: string; cover_url: string | null; duration_seconds: number | null };
type Phrase = { id: string; text: string; author: string | null; category: string };
type Image = { id: string; title: string; caption: string | null; image_url: string; category: string };

type Tab = "audios" | "frases" | "imagens";

function RelaxarPage() {
  const [tab, setTab] = useState<Tab>("audios");
  const [loading, setLoading] = useState(true);
  const [audios, setAudios] = useState<Audio[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [audioCat, setAudioCat] = useState<string>("all");
  const [phraseCat, setPhraseCat] = useState<string>("all");
  const [imageCat, setImageCat] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, p, i] = await Promise.all([
        supabase.from("library_audios").select("*").eq("published", true).order("sort_order").order("created_at", { ascending: false }),
        supabase.from("library_phrases").select("*").eq("published", true).order("created_at", { ascending: false }),
        supabase.from("library_images").select("*").eq("published", true).order("sort_order").order("created_at", { ascending: false }),
      ]);
      setAudios((a.data ?? []) as Audio[]);
      setPhrases((p.data ?? []) as Phrase[]);
      setImages((i.data ?? []) as Image[]);
      setLoading(false);
    })();
  }, []);

  const filteredAudios = useMemo(() => (audioCat === "all" ? audios : audios.filter((x) => x.category === audioCat)), [audios, audioCat]);
  const filteredPhrases = useMemo(() => (phraseCat === "all" ? phrases : phrases.filter((x) => x.category === phraseCat)), [phrases, phraseCat]);
  const filteredImages = useMemo(() => (imageCat === "all" ? images : images.filter((x) => x.category === imageCat)), [images, imageCat]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-primary"><Volume2 className="size-6" /></div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Relaxar & respirar</h1>
          <p className="text-sm text-muted-foreground">Áudios, frases e imagens para desacelerar quando o dia pesa.</p>
        </div>
      </header>

      <div className="mt-4"><BreathingButton /></div>

      <div className="mt-6 flex gap-2">
        {(["audios", "frases", "imagens"] as Tab[]).map((t) => {
          const Icon = t === "audios" ? Headphones : t === "frases" ? Quote : ImageIcon;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              <Icon className="size-4" />
              {t === "audios" ? "Áudios" : t === "frases" ? "Frases" : "Imagens"}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : tab === "audios" ? (
        <section className="mt-6 space-y-4">
          <CategoryPills value={audioCat} onChange={setAudioCat} options={AUDIO_CATEGORIES} />
          {filteredAudios.length === 0 ? (
            <EmptyBox text="Ainda sem áudios nesta categoria. Volte em breve — nossa curadoria está crescendo." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredAudios.map((a) => <AudioCard key={a.id} audio={a} />)}
            </div>
          )}
        </section>
      ) : tab === "frases" ? (
        <section className="mt-6 space-y-4">
          <CategoryPills value={phraseCat} onChange={setPhraseCat} options={PHRASE_CATEGORIES} />
          {filteredPhrases.length === 0 ? (
            <EmptyBox text="Sem frases nesta categoria." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredPhrases.map((p) => (
                <blockquote key={p.id} className="rounded-2xl border border-border bg-card p-5">
                  <Quote className="mb-2 size-4 text-primary/60" aria-hidden />
                  <p className="text-sm leading-relaxed text-foreground">{p.text}</p>
                  {p.author && <cite className="mt-2 block text-xs text-muted-foreground">— {p.author}</cite>}
                </blockquote>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          <CategoryPills value={imageCat} onChange={setImageCat} options={IMAGE_CATEGORIES} />
          {filteredImages.length === 0 ? (
            <EmptyBox text="Sem imagens nesta categoria." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredImages.map((im) => <ImageCard key={im.id} image={im} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CategoryPills({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly { id: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill active={value === "all"} onClick={() => onChange("all")}>Todos</Pill>
      {options.map((o) => (
        <Pill key={o.id} active={value === o.id} onClick={() => onChange(o.id)}>{o.label}</Pill>
      ))}
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"
      }`}
    >{children}</button>
  );
}

function EmptyBox({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function AudioCard({ audio }: { audio: Audio }) {
  const [signed, setSigned] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { libraryMediaUrl(audio.cover_url).then(setCover); }, [audio.cover_url]);

  async function toggle() {
    if (!signed) {
      setLoading(true);
      const url = await libraryMediaUrl(audio.audio_url);
      setSigned(url);
      setLoading(false);
      if (!url) return;
      setTimeout(() => { ref.current?.play(); setPlaying(true); }, 50);
      return;
    }
    if (playing) { ref.current?.pause(); setPlaying(false); } else { ref.current?.play(); setPlaying(true); }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[3/1] bg-gradient-to-br from-primary/20 to-brand-soft">
        {cover && <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{audio.title}</p>
            <p className="text-[10px] uppercase tracking-wide text-white/80">{AUDIO_CATEGORIES.find((c) => c.id === audio.category)?.label ?? audio.category}</p>
          </div>
          <button
            onClick={toggle}
            aria-label={playing ? "Pausar" : "Tocar"}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-primary shadow-lg transition hover:scale-105"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </button>
        </div>
      </div>
      {audio.description && <p className="p-3 text-xs text-muted-foreground">{audio.description}</p>}
      {signed && (
        <audio
          ref={ref}
          src={signed}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          preload="none"
        />
      )}
    </article>
  );
}

function ImageCard({ image }: { image: Image }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { libraryMediaUrl(image.image_url).then(setUrl); }, [image.image_url]);
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-square bg-brand-soft">
        {url && <img src={url} alt={image.title} loading="lazy" className="size-full object-cover" />}
      </div>
      <figcaption className="p-3">
        <p className="text-sm font-medium text-foreground">{image.title}</p>
        {image.caption && <p className="mt-0.5 text-xs text-muted-foreground">{image.caption}</p>}
      </figcaption>
    </figure>
  );
}
