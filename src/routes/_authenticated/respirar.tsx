import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, ArrowLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Check, Sparkles } from "lucide-react";
import { AmbientSounds } from "@/components/AmbientSounds";

export const Route = createFileRoute("/_authenticated/respirar")({
  component: RespirarPage,
  head: () => ({
    meta: [
      { title: "Respiração guiada — Desabafo Amigo" },
      { name: "description", content: "Exercícios de respiração guiada para relaxar, meditar e aliviar a ansiedade em 1, 5 ou 10 minutos." },
    ],
  }),
});

type Phase = { key: "inhale" | "hold" | "exhale" | "rest"; label: string; seconds: number; scale: number };
type Technique = {
  id: string;
  name: string;
  tag: string;
  desc: string;
  phases: Phase[];
  color: string;
  ring: string;
};

const TECHNIQUES: Technique[] = [
  {
    id: "478",
    name: "Respiração 4-7-8",
    tag: "Para dormir e acalmar",
    desc: "Inspire por 4s, segure 7s e solte 8s. Ativa o parassimpático e reduz a ansiedade.",
    color: "from-sky-500/30 to-blue-500/10",
    ring: "rgba(56,189,248,0.55)",
    phases: [
      { key: "inhale", label: "Inspire pelo nariz", seconds: 4, scale: 1 },
      { key: "hold",   label: "Segure o ar",       seconds: 7, scale: 1 },
      { key: "exhale", label: "Solte pela boca",   seconds: 8, scale: 0.55 },
    ],
  },
  {
    id: "box",
    name: "Respiração quadrada",
    tag: "Foco e clareza",
    desc: "4s inspira, 4s segura, 4s solta, 4s pausa. Usada por atletas e forças especiais.",
    color: "from-emerald-500/30 to-teal-500/10",
    ring: "rgba(16,185,129,0.55)",
    phases: [
      { key: "inhale", label: "Inspire",     seconds: 4, scale: 1 },
      { key: "hold",   label: "Segure",      seconds: 4, scale: 1 },
      { key: "exhale", label: "Expire",      seconds: 4, scale: 0.55 },
      { key: "rest",   label: "Pausa",       seconds: 4, scale: 0.55 },
    ],
  },
  {
    id: "coerencia",
    name: "Coerência cardíaca",
    tag: "Equilíbrio emocional",
    desc: "5s inspirando, 5s expirando. Sincroniza coração e respiração em ~6 ciclos por minuto.",
    color: "from-amber-500/30 to-rose-500/10",
    ring: "rgba(251,113,133,0.55)",
    phases: [
      { key: "inhale", label: "Inspire lentamente", seconds: 5, scale: 1 },
      { key: "exhale", label: "Expire suavemente",  seconds: 5, scale: 0.55 },
    ],
  },
];

const DURATIONS = [
  { min: 1,  label: "1 min",  desc: "Pausa rápida" },
  { min: 5,  label: "5 min",  desc: "Recomeço" },
  { min: 10, label: "10 min", desc: "Meditação" },
];

function playTone(ctxRef: React.MutableRefObject<AudioContext | null>, freq: number, duration = 0.25) {
  try {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = ctxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("a11y-reduce-motion"));

function RespirarPage() {
  const [techId, setTechId] = useState<string>("478");
  const [minutes, setMinutes] = useState<number>(5);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [sound, setSound] = useState(true);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [pulse, setPulse] = useState(0); // trigger para pulso ao trocar fase
  const audioCtx = useRef<AudioContext | null>(null);

  const technique = useMemo(() => TECHNIQUES.find(t => t.id === techId)!, [techId]);
  const totalSeconds = minutes * 60;
  const phase = technique.phases[phaseIdx];
  const reduce = prefersReducedMotion();

  useEffect(() => {
    if (!running) return;
    setRemaining(technique.phases[0].seconds);
    setPhaseIdx(0);
  }, [running, techId]);

  useEffect(() => {
    if (!running || done) return;
    const t = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        if (next >= totalSeconds) {
          setRunning(false);
          setDone(true);
          if (sound) playTone(audioCtx, 660, 0.6);
        }
        return next;
      });
      setRemaining(r => {
        if (r > 1) return r - 1;
        setPhaseIdx(i => {
          const nextIdx = (i + 1) % technique.phases.length;
          if (sound) {
            const nextPhase = technique.phases[nextIdx];
            const freq = nextPhase.key === "inhale" ? 523 : nextPhase.key === "exhale" ? 392 : 440;
            playTone(audioCtx, freq, 0.18);
          }
          setPulse(p => p + 1);
          return nextIdx;
        });
        return technique.phases[(phaseIdx + 1) % technique.phases.length].seconds;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, done, technique, sound, phaseIdx, totalSeconds]);

  function start() {
    setDone(false);
    setElapsed(0);
    setPhaseIdx(0);
    setRemaining(technique.phases[0].seconds);
    setRunning(true);
    if (sound) playTone(audioCtx, 523, 0.2);
  }
  function reset() {
    setRunning(false);
    setDone(false);
    setElapsed(0);
    setPhaseIdx(0);
    setRemaining(technique.phases[0].seconds);
  }

  const progress = Math.min(100, (elapsed / totalSeconds) * 100);
  const mm = String(Math.floor((totalSeconds - elapsed) / 60)).padStart(2, "0");
  const ss = String((totalSeconds - elapsed) % 60).padStart(2, "0");

  // Escala alvo do círculo por fase
  const targetScale = phase.key === "inhale" ? 1.15 : phase.key === "exhale" ? 0.6 : phase.key === "hold" ? 1.15 : 0.6;
  const transitionDur = reduce ? 0.2 : phase.seconds;

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Aurora suave animada */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(56,189,248,0.22), transparent)" }}
        animate={reduce ? undefined : { opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/apoio" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10">
            <ArrowLeft className="size-3.5" /> Central de apoio
          </Link>
          <button
            onClick={() => setSound(s => !s)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
            aria-label={sound ? "Silenciar sons" : "Ativar sons"}
          >
            {sound ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            {sound ? "Som ligado" : "Silencioso"}
          </button>
        </div>

        <motion.header
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
            <Wind className="size-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Respire comigo</h1>
          <p className="mt-2 text-sm text-slate-400">Escolha uma técnica, uma duração e siga o círculo. Você está seguro(a) aqui.</p>
        </motion.header>

        <AnimatePresence mode="wait">
          {!running && !done && (
            <motion.div
              key="setup"
              className="space-y-6"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Técnica</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {TECHNIQUES.map((t, idx) => {
                    const active = t.id === techId;
                    return (
                      <motion.button
                        key={t.id}
                        onClick={() => setTechId(t.id)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`text-left rounded-2xl border p-4 transition ${active ? "border-sky-400/60 bg-sky-500/10 ring-1 ring-sky-400/40" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                      >
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">{t.tag}</div>
                        <div className="mt-1 text-base font-semibold text-white">{t.name}</div>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">{t.desc}</p>
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Duração</h2>
                <div className="grid grid-cols-3 gap-3">
                  {DURATIONS.map((d, idx) => {
                    const active = d.min === minutes;
                    return (
                      <motion.button
                        key={d.min}
                        onClick={() => setMinutes(d.min)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + idx * 0.05, duration: 0.3 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`rounded-2xl border p-4 text-center transition ${active ? "border-sky-400/60 bg-sky-500/10 ring-1 ring-sky-400/40" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                      >
                        <div className="text-2xl font-semibold text-white">{d.label}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{d.desc}</div>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
              <AmbientSounds />


              <motion.button
                onClick={start}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sky-900/40 transition hover:brightness-110"
              >
                <Play className="size-5" /> Iniciar sessão
              </motion.button>
            </motion.div>
          )}

          {running && !done && (
            <motion.div
              key="running"
              className="flex flex-col items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Barra de progresso circular via SVG */}
              <div className="mb-6 w-full max-w-md">
                <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-slate-400">
                  <span>{technique.name}</span>
                  <span>{mm}:{ss}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-sky-400 to-blue-500"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
              </div>

              <div className="relative grid place-items-center">
                {/* Halos pulsando ao trocar fase */}
                <AnimatePresence>
                  <motion.span
                    key={pulse}
                    aria-hidden
                    className="absolute rounded-full"
                    initial={{ width: 240, height: 240, opacity: 0.35, boxShadow: `0 0 0 0 ${technique.ring}` }}
                    animate={{ width: 380, height: 380, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.6, ease: "easeOut" }}
                    style={{ background: `radial-gradient(closest-side, ${technique.ring}, transparent)` }}
                  />
                </AnimatePresence>

                <div className={`absolute inset-0 -m-10 rounded-full bg-gradient-to-br ${technique.color} blur-2xl`} />

                {/* Círculo respiratório */}
                <motion.div
                  className="relative grid size-64 place-items-center rounded-full bg-gradient-to-br from-sky-500/30 to-blue-600/10 shadow-2xl shadow-sky-900/40 sm:size-72"
                  animate={{ scale: targetScale }}
                  transition={{ duration: transitionDur, ease: [0.42, 0, 0.58, 1] }}
                >
                  {/* Anel interno com respiração sutil constante */}
                  <motion.div
                    aria-hidden
                    className="absolute inset-3 rounded-full border border-white/10"
                    animate={reduce ? undefined : { opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <div className="relative text-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${phaseIdx}-${remaining}`}
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                        transition={{ duration: 0.35 }}
                        className="text-5xl font-bold text-white sm:text-6xl"
                      >
                        {remaining || phase.seconds}
                      </motion.div>
                    </AnimatePresence>
                    <div className="mt-2 text-xs uppercase tracking-widest text-sky-200/80">segundos</div>
                  </div>
                </motion.div>
              </div>

              <AnimatePresence mode="wait">
                <motion.p
                  key={phase.key + phaseIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="mt-10 text-xl font-semibold text-white"
                >
                  {phase.label}
                </motion.p>
              </AnimatePresence>
              <p className="mt-2 max-w-sm text-center text-sm text-slate-400">Mantenha a calma. Deixe o corpo relaxar. Você está indo bem.</p>

              <div className="mt-8 flex gap-3">
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setRunning(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/10"
                >
                  <Pause className="size-4" /> Pausar
                </motion.button>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/10"
                >
                  <RotateCcw className="size-4" /> Recomeçar
                </motion.button>
              </div>
              <div className="mt-8 w-full max-w-md">
                <AmbientSounds />
              </div>
            </motion.div>
          )}

          {!running && elapsed > 0 && !done && (
            <motion.div
              key="paused"
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm text-slate-400">Sessão pausada — {mm}:{ss} restantes</p>
              <div className="flex gap-3">
                <button onClick={() => setRunning(true)} className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400">
                  <Play className="size-4" /> Continuar
                </button>
                <button onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/10">
                  <RotateCcw className="size-4" /> Recomeçar
                </button>
              </div>
            </motion.div>
          )}

          {done && (
            <motion.div
              key="done"
              className="mx-auto max-w-md text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300"
              >
                <Check className="size-8" />
              </motion.div>
              <h2 className="text-2xl font-semibold text-white">Muito bem!</h2>
              <p className="mt-2 text-sm text-slate-400">
                Você concluiu {minutes} {minutes === 1 ? "minuto" : "minutos"} de {technique.name.toLowerCase()}.
                Perceba como o corpo está agora — os ombros mais soltos, a respiração mais lenta.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button onClick={start} className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-400">
                  <Sparkles className="size-4" /> Fazer novamente
                </button>
                <Link to="/apoio" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-slate-200 hover:bg-white/10">
                  Voltar para o apoio
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
