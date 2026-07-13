import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ShieldCheck, User, Target, RefreshCw } from "lucide-react";
import { getMyAuditTrail, type AuditItem } from "@/lib/audit.functions";

export const Route = createFileRoute("/_authenticated/transparencia")({
  component: TransparenciaPage,
});

const LABELS: Record<string, string> = {
  account_deleted: "Conta apagada",
  data_exported: "Meus dados exportados",
  signed_in: "Você entrou no app",
  signed_out: "Você saiu do app",
  volunteer_approved: "Sua candidatura foi aprovada",
  volunteer_rejected: "Sua candidatura foi rejeitada",
  password_reset: "Senha redefinida",
  role_granted: "Permissão concedida",
  role_revoked: "Permissão removida",
};

function human(action: string) {
  return LABELS[action] ?? action.replaceAll("_", " ");
}

function TransparenciaPage() {
  const fetchFn = useServerFn(getMyAuditTrail);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchFn();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" /> Transparência
          </div>
          <h1 className="text-2xl font-semibold text-foreground">O que aconteceu na sua conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Últimos 100 eventos em que você aparece como origem ou alvo. Nada aqui é compartilhado
            com outros usuários — é só para você acompanhar.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Atualizar lista"
          className="rounded-lg border border-border p-2 hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="mt-6 space-y-2">
        {loading && items.length === 0 && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </>
        )}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
          </div>
        )}

        {items.map((it) => (
          <div key={it.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
            <div
              className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                it.role === "actor" ? "bg-primary/10 text-primary" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              }`}
              aria-hidden
            >
              {it.role === "actor" ? <User className="size-4" /> : <Target className="size-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{human(it.action)}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(it.created_at).toLocaleString("pt-BR")}{" "}
                <span className="opacity-60">· {it.role === "actor" ? "você fez" : "aconteceu com você"}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
