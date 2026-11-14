import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export type CaptionSegment = { start: number; end: number; text: string };
export type CaptionTrack = { lang: string; label: string; segments: CaptionSegment[] };

/**
 * Audio player that highlights the active segment of the original transcript
 * and any translation tracks in sync with playback time.
 */
export function SyncedAudioPlayer({
  src,
  original,
  tracks,
  visibleLangs,
  compact,
}: {
  src: string;
  original?: CaptionTrack;
  tracks: CaptionTrack[];
  visibleLangs: Set<string>; // includes "__original" for original transcript
  compact?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
    };
  }, [src]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }

  function seekTo(t: number) {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, t);
    void el.play();
  }

  const showOriginal = original && visibleLangs.has("__original") && original.segments.length > 0;
  const visibleTracks = tracks.filter((t) => visibleLangs.has(t.lang) && t.segments.length > 0);

  return (
    <div className={`mt-1 ${compact ? "" : ""}`}>
      <div className="flex min-w-0 items-center gap-2 rounded-full bg-background/50 px-2 py-1">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pausar" : "Reproduzir"}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90"
        >
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <ProgressBar
          time={time}
          duration={duration}
          onSeek={(t) => {
            const el = audioRef.current;
            if (el) el.currentTime = t;
          }}
        />
        <span className="w-16 shrink-0 text-right text-[10px] tabular-nums opacity-70">
          {fmt(time)} / {fmt(duration)}
        </span>
      </div>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      {(showOriginal || visibleTracks.length > 0) && (
        <div className="mt-2 space-y-2">
          {showOriginal && original && (
            <CaptionRow
              label={original.label}
              segments={original.segments}
              time={time}
              onSeek={seekTo}
              italic
            />
          )}
          {visibleTracks.map((t) => (
            <CaptionRow
              key={t.lang}
              label={t.label}
              segments={t.segments}
              time={time}
              onSeek={seekTo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CaptionRow({
  label,
  segments,
  time,
  onSeek,
  italic,
}: {
  label: string;
  segments: CaptionSegment[];
  time: number;
  onSeek: (t: number) => void;
  italic?: boolean;
}) {
  const activeIdx = segments.findIndex((s) => time >= s.start && time < s.end);
  return (
    <div className="rounded-lg bg-background/30 p-2 text-[12px] leading-snug">
      <p className="mb-1 text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className={italic ? "italic" : ""}>
        {segments.map((seg, i) => {
          const active = i === activeIdx;
          const past = activeIdx >= 0 && i < activeIdx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(seg.start)}
              className={`mr-1 min-h-9 rounded px-2 py-2 text-left transition-colors ${
                active
                  ? "bg-primary/80 text-primary-foreground shadow-sm"
                  : past
                    ? "text-foreground/60"
                    : "hover:bg-background/60"
              }`}
              aria-current={active ? "true" : undefined}
              aria-label={`Ir para ${fmt(seg.start)}`}
            >
              {seg.text}
            </button>
          );
        })}
      </p>
    </div>
  );
}

function ProgressBar({
  time,
  duration,
  onSeek,
}: {
  time: number;
  duration: number;
  onSeek: (t: number) => void;
}) {
  const pct = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <div
      role="slider"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(time)}
      tabIndex={0}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        onSeek(ratio * duration);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onSeek(Math.min(duration, time + 2));
        if (e.key === "ArrowLeft") onSeek(Math.max(0, time - 2));
      }}
      className="relative flex h-10 min-w-0 flex-1 cursor-pointer items-center rounded-full"
    >
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-background/60" />
      <div
        className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
