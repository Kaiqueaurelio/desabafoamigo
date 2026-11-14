import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { submitQuiz } from "@/lib/training.functions";
import { GraduationCap, CheckCircle2, Circle, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pro/treinamento")({
  ssr: false,
  component: TrainingPage,
});

type QuizQ = { q: string; options: string[]; answer: number };
type Module = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  quiz: QuizQ[];
  min_score: number;
  sort_order: number;
};
type Progress = {
  module_id: string;
  quiz_score: number;
  passed: boolean;
  attempts: number;
  completed_at: string | null;
};

function TrainingPage() {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [active, setActive] = useState<Module | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const submit = useServerFn(submitQuiz);

  async function load() {
    setLoading(true);
    const { data: mods } = await supabase
      .from("volunteer_training_modules")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    setModules((mods ?? []) as unknown as Module[]);

    const { data: prog } = await supabase
      .from("volunteer_training_progress")
      .select("module_id, quiz_score, passed, attempts, completed_at");
    const map: Record<string, Progress> = {};
    (prog ?? []).forEach((p) => (map[p.module_id] = p as Progress));
    setProgress(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const completedCount = useMemo(
    () => modules.filter((m) => progress[m.id]?.passed).length,
    [modules, progress],
  );

  async function handleSubmit() {
    if (!active) return;
    const total = active.quiz.length;
    const arr = Array.from({ length: total }, (_, i) => answers[i] ?? -1);
    if (arr.some((a) => a < 0)) {
      toast.error("Responda todas as perguntas.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submit({ data: { moduleId: active.id, answers: arr } });
      if (res.passed) {
        toast.success(`Aprovado! ${res.score}%`);
      } else {
        toast.error(`Você fez ${res.score}%. Mínimo ${res.minScore}%. Revise e tente novamente.`);
      }
      setActive(null);
      setAnswers({});
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Loader2 className="size-6 animate-spin text-sky-300" />
      </div>
    );
  }

  if (active) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <button
          onClick={() => {
            setActive(null);
            setAnswers({});
          }}
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
        >
          <ArrowLeft className="size-4" /> Voltar à trilha
        </button>
        <h1 className="text-xl font-semibold text-white">{active.title}</h1>
        <p className="mt-1 text-sm text-slate-400">{active.summary}</p>

        <article className="prose prose-invert mt-6 max-w-none whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-relaxed text-slate-200">
          {active.content}
        </article>

        <section className="mt-8 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Quiz — nota mínima {active.min_score}%
          </h2>
          {active.quiz.map((q, qi) => (
            <fieldset key={qi} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <legend className="mb-2 px-1 text-sm font-medium text-white">
                {qi + 1}. {q.q}
              </legend>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5"
                  >
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      value={oi}
                      checked={answers[qi] === oi}
                      onChange={() => setAnswers({ ...answers, [qi]: oi })}
                      className="accent-sky-400"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar respostas"}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
            <GraduationCap className="size-3.5" />
            Trilha do voluntário
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Preparação obrigatória</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Você precisa concluir todos os módulos com nota mínima para ser aprovado(a) como
            voluntário(a).
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
          <div className="text-2xl font-semibold text-white tabular-nums">
            {completedCount}/{modules.length}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Concluídos</div>
        </div>
      </header>

      <ul className="space-y-3">
        {modules.map((m) => {
          const p = progress[m.id];
          const done = p?.passed;
          return (
            <li
              key={m.id}
              className={`rounded-2xl border p-4 transition ${
                done
                  ? "border-emerald-400/30 bg-emerald-500/5"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-start gap-3">
                {done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="size-5 shrink-0 text-slate-500" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{m.summary}</p>
                  {p && (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Última tentativa: {p.quiz_score}% · {p.attempts} tentativa(s)
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setActive(m);
                    setAnswers({});
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  {done ? (
                    <>
                      <RefreshCw className="size-3.5" /> Refazer
                    </>
                  ) : (
                    "Estudar"
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {completedCount === modules.length && modules.length > 0 && (
        <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <strong className="block">Trilha concluída!</strong>
          Sua aprovação será liberada assim que um administrador revisar seu perfil.
          <Link to="/pro" className="mt-2 inline-block text-emerald-200 underline">
            Voltar ao painel
          </Link>
        </div>
      )}
    </div>
  );
}
