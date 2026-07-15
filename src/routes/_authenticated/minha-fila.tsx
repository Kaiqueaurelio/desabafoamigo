import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { cancelMyQueue } from "@/lib/queue.functions";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Row = {
  in_queue: boolean;
  queue_id: string | null;
  queue_position: number | null;
  ahead_of_me: number | null;
  urgency: string | null;
  created_at: string | null;
  waiting_seconds: number | null;
  estimated_wait_seconds: number | null;
  avg_service_seconds: number | null;
};

export const Route = createFileRoute("/_authenticated/minha-fila")({
  component: MinhaFila,
});

function fmtMin(s: number | null | undefined) {
  if (!s || s < 0) return "0 min";
  const m = Math.round(s / 60);
  if (m < 1) return "menos de 1 min";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${(m % 60).toString().padStart(2, "0")}`;
}

function MinhaFila() {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialAhead, setInitialAhead] = useState<number | null>(null);

  async function load(soft = false) {
    if (soft) setRefreshing(true); else setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("my_queue_position");
    if (error) setError(error.message);
    else {
      const r = (Array.isArray(data) ? data[0] : data) as Row | null;
      setRow(r);
      if (r?.in_queue && initialAhead == null) setInitialAhead(r.ahead_of_me ?? 0);
      if (!r?.in_queue) setInitialAhead(null);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-xl bg-brand-soft text-primary">
          <Users className="size-6" aria-hidden />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary">Minha fila</h1>
          <p className="text-sm text-muted-foreground">
            Sua posição atual e uma estimativa do tempo de espera. Ninguém mais vê esses dados.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={refreshing || loading}
          aria-label="Atualizar"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </header>

      {loading ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-10 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      ) : !row?.in_queue ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-8 text-primary" aria-hidden />
          <p className="text-lg font-semibold text-foreground">Você não está na fila.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Quando entrar em uma fila de escuta, sua posição aparece aqui em tempo real.
          </p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.section
            key={row.queue_position ?? "pos"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Sua posição
              </span>
              <motion.p
                key={`n-${row.queue_position}`}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="text-6xl font-black tabular-nums text-primary sm:text-7xl"
              >
                {row.queue_position}
              </motion.p>
              <p className="text-sm text-muted-foreground">
                {row.ahead_of_me === 0
                  ? "Você é o próximo(a) a ser atendido(a)."
                  : `${row.ahead_of_me} pessoa${row.ahead_of_me === 1 ? "" : "s"} à sua frente`}
              </p>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden /> Tempo estimado
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  ~ {fmtMin(row.estimated_wait_seconds)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Baseado no tempo médio das últimas conversas.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <div className="mb-1 flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden /> Você está esperando há
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {fmtMin(row.waiting_seconds)}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {row.urgency === "high" && (
                    <Badge variant="destructive">Urgência alta</Badge>
                  )}
                  {row.urgency === "medium" && <Badge>Média</Badge>}
                  {row.urgency === "low" && <Badge variant="secondary">Fila padrão</Badge>}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso na fila</span>
                <span className="tabular-nums">
                  {initialAhead != null
                    ? `${Math.max(0, initialAhead - (row.ahead_of_me ?? 0))}/${Math.max(1, initialAhead)}`
                    : ""}
                </span>
              </div>
              <Progress
                value={
                  initialAhead && initialAhead > 0
                    ? Math.min(
                        100,
                        Math.round(
                          ((initialAhead - (row.ahead_of_me ?? 0)) / initialAhead) * 100
                        )
                      )
                    : row.ahead_of_me === 0
                      ? 100
                      : 5
                }
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Atualiza automaticamente a cada 15 segundos. Estas informações são privadas —
                somente você vê sua posição e tempo estimado.
              </p>
            </div>
          </motion.section>
        </AnimatePresence>
      )}
    </div>
  );
}
