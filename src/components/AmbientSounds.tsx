import { useCallback, useEffect, useRef, useState } from "react";
import { Waves, CloudRain, Wind as WindIcon, Music4, Volume2, VolumeX } from "lucide-react";

type AmbientKey = "waves" | "rain" | "forest";

type Track = {
  key: AmbientKey;
  label: string;
  Icon: typeof Waves;
  color: string;
};

const TRACKS: Track[] = [
  { key: "waves",  label: "Ondas do mar", Icon: Waves,     color: "text-sky-300" },
  { key: "rain",   label: "Chuva leve",   Icon: CloudRain, color: "text-cyan-300" },
  { key: "forest", label: "Vento e mata", Icon: WindIcon,  color: "text-emerald-300" },
];

// Cria um buffer de ruído (branco) reutilizável
function createNoiseBuffer(ctx: AudioContext, seconds = 2) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

type Node = {
  master: GainNode;
  stop: () => void;
};

function buildWaves(ctx: AudioContext, noise: AudioBuffer): Node {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  lp.Q.value = 0.6;
  // LFO simulando vai-e-vem das ondas
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain).connect(lp.frequency);
  const master = ctx.createGain();
  master.gain.value = 0;
  src.connect(lp).connect(master);
  src.start();
  lfo.start();
  return { master, stop: () => { try { src.stop(); lfo.stop(); } catch {} } };
}

function buildRain(ctx: AudioContext, noise: AudioBuffer): Node {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1200;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 6000;
  const master = ctx.createGain();
  master.gain.value = 0;
  src.connect(hp).connect(lp).connect(master);
  src.start();
  return { master, stop: () => { try { src.stop(); } catch {} } };
}

function buildForest(ctx: AudioContext, noise: AudioBuffer): Node {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 350;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.06;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(lp.frequency);
  const master = ctx.createGain();
  master.gain.value = 0;
  src.connect(lp).connect(master);
  src.start();
  lfo.start();
  return { master, stop: () => { try { src.stop(); lfo.stop(); } catch {} } };
}

export function AmbientSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Partial<Record<AmbientKey, Node>>>({});
  const [volumes, setVolumes] = useState<Record<AmbientKey, number>>({ waves: 0, rain: 0, forest: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => () => {
    // cleanup on unmount
    Object.values(nodesRef.current).forEach(n => n?.stop());
    ctxRef.current?.close().catch(() => {});
  }, []);

  async function ensureCtx() {
    if (ctxRef.current) {
      if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
      return ctxRef.current;
    }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;
    const noise = createNoiseBuffer(ctx, 3);
    nodesRef.current.waves = buildWaves(ctx, noise);
    nodesRef.current.rain = buildRain(ctx, noise);
    nodesRef.current.forest = buildForest(ctx, noise);
    Object.values(nodesRef.current).forEach(n => n?.master.connect(ctx.destination));
    setReady(true);
    return ctx;
  }

  async function handleChange(key: AmbientKey, value: number) {
    const ctx = await ensureCtx();
    const node = nodesRef.current[key];
    if (!node) return;
    // volume máximo bem discreto (0.18) para manter sutileza
    const target = (value / 100) * 0.18;
    node.master.gain.cancelScheduledValues(ctx.currentTime);
    node.master.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.25);
    setVolumes(v => ({ ...v, [key]: value }));
  }

  return (
    <section
      aria-label="Sons ambientais"
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <Music4 className="size-4 text-sky-300" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Sons ambientais
        </h2>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-slate-500">
          Opcional · sutil
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Combine e ajuste o volume de cada som para criar sua paisagem sonora.
      </p>
      <div className="space-y-3">
        {TRACKS.map(({ key, label, Icon, color }) => (
          <div key={key} className="flex items-center gap-3">
            <div className={`grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 ${color}`}>
              <Icon className="size-4" />
            </div>
            <label className="flex-1 min-w-0">
              <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                <span>{label}</span>
                <span className="tabular-nums text-slate-500">{volumes[key]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={volumes[key]}
                onChange={(e) => handleChange(key, Number(e.target.value))}
                aria-label={`Volume — ${label}`}
                className="w-full accent-sky-400"
              />
            </label>
          </div>
        ))}
      </div>
      {!ready && (
        <p className="mt-3 text-[10px] text-slate-500">
          Toque no controle para começar a ouvir.
        </p>
      )}
    </section>
  );
}
