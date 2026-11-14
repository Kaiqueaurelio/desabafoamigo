import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  libraryMediaUrl,
  AUDIO_CATEGORIES,
  PHRASE_CATEGORIES,
  IMAGE_CATEGORIES,
} from "@/lib/library";
import {
  Headphones,
  Quote,
  ImageIcon,
  Play,
  Pause,
  Loader2,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  X,
} from "lucide-react";
import { BreathingButton } from "@/components/BreathingExercise";

export const Route = createFileRoute("/_authenticated/relaxar")({
  component: RelaxarPage,
});

type Audio = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
};
type Phrase = { id: string; text: string; author: string | null; category: string };
type ImgRow = {
  id: string;
  title: string;
  caption: string | null;
  image_url: string;
  category: string;
};

type Tab = "audios" | "frases" | "imagens";
type Repeat = "off" | "all" | "one";

const FAV_KEY = "desabafa:relaxar:favs";
const VOL_KEY = "desabafa:relaxar:vol";

function RelaxarPage() {
  const [tab, setTab] = useState<Tab>("audios");
  const [loading, setLoading] = useState(true);
  const [audios, setAudios] = useState<Audio[]>([]);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [images, setImages] = useState<ImgRow[]>([]);
  const [audioCat, setAudioCat] = useState<string>("all");
  const [phraseCat, setPhraseCat] = useState<string>("all");
  const [imageCat, setImageCat] = useState<string>("all");

  // player state
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedCover, setSignedCover] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 0.8;
    const v = Number(localStorage.getItem(VOL_KEY));
    return Number.isFinite(v) && v > 0 ? v : 0.8;
  });
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<Repeat>("off");
  const [favs, setFavs] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      return new Set(JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"));
    } catch {
      return new Set();
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, p, i] = await Promise.all([
        supabase
          .from("library_audios")
          .select("*")
          .eq("published", true)
          .order("sort_order")
          .order("created_at", { ascending: false }),
        supabase
          .from("library_phrases")
          .select("*")
          .eq("published", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("library_images")
          .select("*")
          .eq("published", true)
          .order("sort_order")
          .order("created_at", { ascending: false }),
      ]);
      setAudios((a.data ?? []) as Audio[]);
      setPhrases((p.data ?? []) as Phrase[]);
      setImages((i.data ?? []) as ImgRow[]);
      setLoading(false);
    })();
  }, []);

  const filteredAudios = useMemo(
    () => (audioCat === "all" ? audios : audios.filter((x) => x.category === audioCat)),
    [audios, audioCat],
  );
  const filteredPhrases = useMemo(
    () => (phraseCat === "all" ? phrases : phrases.filter((x) => x.category === phraseCat)),
    [phrases, phraseCat],
  );
  const filteredImages = useMemo(
    () => (imageCat === "all" ? images : images.filter((x) => x.category === imageCat)),
    [images, imageCat],
  );

  const queue = filteredAudios;
  const current = currentIdx !== null ? (queue[currentIdx] ?? null) : null;

  // Load signed URLs when track changes
  useEffect(() => {
    if (!current) {
      setSignedUrl(null);
      setSignedCover(null);
      return;
    }
    let cancelled = false;
    setLoadingTrack(true);
    (async () => {
      const [u, c] = await Promise.all([
        libraryMediaUrl(current.audio_url),
        libraryMediaUrl(current.cover_url),
      ]);
      if (cancelled) return;
      setSignedUrl(u);
      setSignedCover(c);
      setLoadingTrack(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  // Autoplay after URL is ready
  useEffect(() => {
    if (!signedUrl || !audioRef.current) return;
    audioRef.current.src = signedUrl;
    audioRef.current
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [signedUrl]);

  // Volume/muted persistence
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = muted;
    }
    try {
      localStorage.setItem(VOL_KEY, String(volume));
    } catch {
      // Preferences are optional when storage is unavailable.
    }
  }, [volume, muted]);

  // Favs persistence
  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs)));
    } catch {
      // Preferences are optional when storage is unavailable.
    }
  }, [favs]);

  const playIndex = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= queue.length) return;
      setCurrentIdx(idx);
    },
    [queue.length],
  );

  const toggle = useCallback(() => {
    if (!audioRef.current || !signedUrl) return;
    if (playing) audioRef.current.pause();
    else
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked until the user interacts with the page.
      });
  }, [playing, signedUrl]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    if (shuffle) {
      let n = Math.floor(Math.random() * queue.length);
      if (queue.length > 1 && n === currentIdx) n = (n + 1) % queue.length;
      setCurrentIdx(n);
      return;
    }
    const n = (currentIdx ?? -1) + 1;
    if (n >= queue.length) {
      if (repeat === "all") setCurrentIdx(0);
      else {
        setPlaying(false);
      }
    } else setCurrentIdx(n);
  }, [currentIdx, queue.length, shuffle, repeat]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const p = (currentIdx ?? 0) - 1;
    setCurrentIdx(p < 0 ? queue.length - 1 : p);
  }, [currentIdx, queue.length]);

  function seekTo(pct: number) {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = pct * duration;
  }

  function toggleFav(id: string) {
    setFavs((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="mx-auto max-w-5xl p-6 pb-40">
      <header className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-primary">
          <Volume2 className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Relaxar & respirar</h1>
          <p className="text-sm text-muted-foreground">
            Áudios, frases e imagens para desacelerar quando o dia pesa.
          </p>
        </div>
      </header>

      <div className="mt-4">
        <BreathingButton />
      </div>

      <div className="mt-6 flex gap-2">
        {(["audios", "frases", "imagens"] as Tab[]).map((t) => {
          const Icon = t === "audios" ? Headphones : t === "frases" ? Quote : ImageIcon;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              <Icon className="size-4" />
              {t === "audios" ? "Áudios" : t === "frases" ? "Frases" : "Imagens"}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : tab === "audios" ? (
        <section className="mt-6 space-y-4">
          <CategoryPills value={audioCat} onChange={setAudioCat} options={AUDIO_CATEGORIES} />
          {filteredAudios.length === 0 ? (
            <EmptyBox text="Ainda sem áudios nesta categoria. Volte em breve — nossa curadoria está crescendo." />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {filteredAudios.map((a, i) => (
                <AudioRow
                  key={a.id}
                  audio={a}
                  index={i}
                  active={current?.id === a.id}
                  playing={playing && current?.id === a.id}
                  loading={loadingTrack && current?.id === a.id}
                  fav={favs.has(a.id)}
                  onPlay={() => (current?.id === a.id ? toggle() : playIndex(i))}
                  onFav={() => toggleFav(a.id)}
                />
              ))}
            </ul>
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
                  {p.author && (
                    <cite className="mt-2 block text-xs text-muted-foreground">— {p.author}</cite>
                  )}
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
              {filteredImages.map((im) => (
                <ImageCard key={im.id} image={im} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Persistent hidden audio element */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          if (repeat === "one" && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          } else {
            next();
          }
        }}
      />

      {current && (
        <PlayerBar
          track={current}
          coverUrl={signedCover}
          playing={playing}
          loading={loadingTrack}
          progress={progress}
          duration={duration}
          volume={volume}
          muted={muted}
          shuffle={shuffle}
          repeat={repeat}
          fav={favs.has(current.id)}
          onToggle={toggle}
          onNext={next}
          onPrev={prev}
          onSeek={seekTo}
          onVolume={(v) => {
            setVolume(v);
            if (v > 0) setMuted(false);
          }}
          onMute={() => setMuted((m) => !m)}
          onShuffle={() => setShuffle((s) => !s)}
          onRepeat={() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"))}
          onFav={() => toggleFav(current.id)}
          onClose={() => {
            audioRef.current?.pause();
            setCurrentIdx(null);
          }}
        />
      )}
    </div>
  );
}

function CategoryPills({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill active={value === "all"} onClick={() => onChange("all")}>
        Todos
      </Pill>
      {options.map((o) => (
        <Pill key={o.id} active={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </Pill>
      ))}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function AudioRow({
  audio,
  index,
  active,
  playing,
  loading,
  fav,
  onPlay,
  onFav,
}: {
  audio: Audio;
  index: number;
  active: boolean;
  playing: boolean;
  loading: boolean;
  fav: boolean;
  onPlay: () => void;
  onFav: () => void;
}) {
  const [cover, setCover] = useState<string | null>(null);
  useEffect(() => {
    libraryMediaUrl(audio.cover_url).then(setCover);
  }, [audio.cover_url]);
  const label = AUDIO_CATEGORIES.find((c) => c.id === audio.category)?.label ?? audio.category;
  return (
    <li
      className={`group flex items-center gap-3 px-3 py-2.5 transition ${active ? "bg-brand-soft/60" : "hover:bg-muted/60"}`}
    >
      <button
        onClick={onPlay}
        aria-label={playing ? "Pausar" : `Tocar ${audio.title}`}
        className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-primary/30 to-brand-soft text-primary"
      >
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="text-[11px] font-semibold tabular-nums text-muted-foreground group-hover:hidden">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <span
          className={`absolute inset-0 grid place-items-center bg-black/40 text-white transition ${active || loading ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        >
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : playing ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5" />
          )}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}
        >
          {audio.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{label}</span>
          {audio.description && <span className="ml-2">{audio.description}</span>}
        </p>
      </div>
      <button
        onClick={onFav}
        aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        className={`rounded-full p-2 transition ${fav ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        <Heart className={`size-4 ${fav ? "fill-current" : ""}`} />
      </button>
      {audio.duration_seconds ? (
        <span className="hidden w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
          {fmt(audio.duration_seconds)}
        </span>
      ) : null}
    </li>
  );
}

function ImageCard({ image }: { image: ImgRow }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    libraryMediaUrl(image.image_url).then(setUrl);
  }, [image.image_url]);
  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-square bg-brand-soft">
        {url && (
          <img src={url} alt={image.title} loading="lazy" className="size-full object-cover" />
        )}
      </div>
      <figcaption className="p-3">
        <p className="text-sm font-medium text-foreground">{image.title}</p>
        {image.caption && <p className="mt-0.5 text-xs text-muted-foreground">{image.caption}</p>}
      </figcaption>
    </figure>
  );
}

function PlayerBar(props: {
  track: Audio;
  coverUrl: string | null;
  playing: boolean;
  loading: boolean;
  progress: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  fav: boolean;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (pct: number) => void;
  onVolume: (v: number) => void;
  onMute: () => void;
  onShuffle: () => void;
  onRepeat: () => void;
  onFav: () => void;
  onClose: () => void;
}) {
  const {
    track,
    coverUrl,
    playing,
    loading,
    progress,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    fav,
    onToggle,
    onNext,
    onPrev,
    onSeek,
    onVolume,
    onMute,
    onShuffle,
    onRepeat,
    onFav,
    onClose,
  } = props;

  const pct = duration ? Math.min(1, progress / duration) : 0;
  const RepeatIcon = repeat === "one" ? Repeat1 : Repeat;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 pb-[env(safe-area-inset-bottom,0px)]">
      {/* progress bar */}
      <SeekBar pct={pct} onSeek={onSeek} />

      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3">
        {/* left: track info */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/30 to-brand-soft">
            {coverUrl && (
              <img src={coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {AUDIO_CATEGORIES.find((c) => c.id === track.category)?.label ?? track.category}
            </p>
          </div>
          <button
            onClick={onFav}
            aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className={`ml-1 hidden rounded-full p-2 transition sm:block ${fav ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Heart className={`size-4 ${fav ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* center: controls */}
        <div className="flex items-center gap-2">
          <IconBtn onClick={onShuffle} active={shuffle} label="Aleatório">
            <Shuffle className="size-4" />
          </IconBtn>
          <IconBtn onClick={onPrev} label="Anterior">
            <SkipBack className="size-5" />
          </IconBtn>
          <button
            onClick={onToggle}
            aria-label={playing ? "Pausar" : "Tocar"}
            className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 active:scale-95"
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : playing ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5 translate-x-[1px]" />
            )}
          </button>
          <IconBtn onClick={onNext} label="Próximo">
            <SkipForward className="size-5" />
          </IconBtn>
          <IconBtn onClick={onRepeat} active={repeat !== "off"} label="Repetir">
            <RepeatIcon className="size-4" />
          </IconBtn>
        </div>

        {/* right: time + volume */}
        <div className="flex items-center justify-end gap-3">
          <span className="hidden text-[11px] tabular-nums text-muted-foreground sm:block">
            {fmt(progress)} / {fmt(duration)}
          </span>
          <div className="hidden items-center gap-2 md:flex">
            <IconBtn onClick={onMute} label={muted ? "Ativar som" : "Silenciar"}>
              {muted || volume === 0 ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </IconBtn>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              aria-label="Volume"
              className="volume-slider h-1 w-24 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar player"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`rounded-full p-2 transition hover:text-foreground ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SeekBar({ pct, onSeek }: { pct: number; onSeek: (pct: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  const pctFromEvent = (clientX: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width));
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => setHover(pctFromEvent(e.clientX));
    const up = (e: MouseEvent) => {
      onSeek(pctFromEvent(e.clientX));
      setDragging(false);
      setHover(null);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging, onSeek]);

  const shown = hover ?? pct;

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        setDragging(true);
        setHover(pctFromEvent(e.clientX));
      }}
      onMouseMove={(e) => !dragging && setHover(pctFromEvent(e.clientX))}
      onMouseLeave={() => !dragging && setHover(null)}
      onClick={(e) => onSeek(pctFromEvent(e.clientX))}
      className="group relative h-1.5 w-full cursor-pointer bg-muted"
      role="slider"
      aria-label="Progresso"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 bg-primary transition-[width]"
        style={{ width: `${shown * 100}%` }}
      />
      <div
        className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow transition group-hover:opacity-100"
        style={{ left: `${shown * 100}%` }}
      />
    </div>
  );
}

function fmt(s: number) {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
