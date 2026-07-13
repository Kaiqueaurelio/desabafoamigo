import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createLgpdRequest,
  getLgpdDownloadUrl,
  listLgpdRequests,
} from "@/lib/lgpd.functions";
import { PasswordInput } from "@/components/PasswordInput";
import {
  ShieldCheck,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/privacidade")({
  component: PrivacyPage,
});

type Req = {
  id: string;
  kind: "export" | "delete";
  format: "json" | "csv" | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  file_path: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

const STATUS_META: Record<Req["status"], { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Aguardando", className: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: Clock },
  processing: { label: "Processando", className: "bg-sky-500/15 text-sky-300 border-sky-500/30", icon: Loader2 },
  completed: { label: "Concluída", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  failed: { label: "Falhou", className: "bg-rose-500/15 text-rose-300 border-rose-500/30", icon: AlertTriangle },
  cancelled: { label: "Cancelada", className: "bg-muted text-muted-foreground border-border", icon: AlertTriangle },
};

function PrivacyPage() {
  const list = useServerFn(listLgpdRequests);
  const create = useServerFn(createLgpdRequest);
  const getUrl = useServerFn(getLgpdDownloadUrl);

  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [busy, setBusy] = useState<null | "export" | "delete">(null);
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    let alive = true;
    list()
      .then((rows) => alive && setRequests(rows as Req[]))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [list]);

  // Realtime — updates status without reloading.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid || cancelled) return;
      const channel = supabase
        .channel(`lgpd_requests:${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lgpd_requests", filter: `user_id=eq.${uid}` },
          (payload) => {
            setRequests((prev) => {
              if (payload.eventType === "INSERT") {
                const next = payload.new as Req;
                if (prev.some((r) => r.id === next.id)) return prev;
                return [next, ...prev];
              }
              if (payload.eventType === "UPDATE") {
                const next = payload.new as Req;
                return prev.map((r) => (r.id === next.id ? next : r));
              }
              if (payload.eventType === "DELETE") {
                const old = payload.old as { id: string };
                return prev.filter((r) => r.id !== old.id);
              }
              return prev;
            });
          },
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(kind: "export" | "delete") {
    if (!password) {
      toast.error("Confirme sua senha para prosseguir.");
      return;
    }
    if (kind === "delete" && confirmDelete.trim().toUpperCase() !== "EXCLUIR") {
      toast.error('Digite "EXCLUIR" para confirmar a exclusão.');
      return;
    }
    setBusy(kind);
    try {
      await create({ data: { kind, format, password } });
      setPassword("");
      setConfirmDelete("");
      toast.success(
        kind === "export"
          ? "Solicitação de exportação recebida. Acompanhe o status abaixo."
          : "Solicitação de exclusão recebida. Aguarde a confirmação abaixo.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function download(id: string) {
    try {
      const { url } = await getUrl({ data: { id } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const activeCount = useMemo(
    () => requests.filter((r) => r.status === "pending" || r.status === "processing").length,
    [requests],
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">LGPD</span>
        </div>
        <h1 className="text-2xl font-semibold">Meus dados e privacidade</h1>
        <p className="text-muted-foreground max-w-2xl">
          Você pode baixar uma cópia de tudo o que guardamos sobre você ou pedir
          para apagar sua conta e seus dados. Todas as solicitações ficam
          registradas abaixo com o status em tempo real.
        </p>
      </header>

      <section
        aria-labelledby="export-h"
        className="rounded-2xl border border-border bg-card p-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Download className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1">
            <h2 id="export-h" className="text-lg font-semibold">
              Exportar meus dados
            </h2>
            <p className="text-sm text-muted-foreground">
              Inclui perfil, humor registrado, conversas em que você enviou
              mensagens, avaliações, favoritos e resumos de sessões.
            </p>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Formato do arquivo</legend>
          <div className="flex gap-2" role="radiogroup" aria-label="Formato">
            <button
              type="button"
              role="radio"
              aria-checked={format === "json"}
              onClick={() => setFormat("json")}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                format === "json"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              <FileJson className="h-4 w-4" aria-hidden /> JSON
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={format === "csv"}
              onClick={() => setFormat("csv")}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                format === "csv"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden /> CSV
            </button>
          </div>
        </fieldset>

        <label className="block text-sm space-y-1">
          <span className="font-medium">Confirme sua senha</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Sua senha atual"
          />
        </label>

        <button
          type="button"
          onClick={() => submit("export")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy === "export" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          Solicitar exportação
        </button>
      </section>

      <section
        aria-labelledby="delete-h"
        className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-rose-500/15 p-2 text-rose-300">
            <Trash2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1">
            <h2 id="delete-h" className="text-lg font-semibold">
              Excluir minha conta
            </h2>
            <p className="text-sm text-muted-foreground">
              Esta ação é permanente. Apagamos seu perfil, humor, favoritos,
              avaliações, resumos e o login. Mensagens em conversas em andamento
              são anonimizadas. Não é possível desfazer.
            </p>
          </div>
        </div>

        <label className="block text-sm space-y-1">
          <span className="font-medium">Confirme sua senha</span>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Sua senha atual"
          />
        </label>

        <label className="block text-sm space-y-1">
          <span className="font-medium">
            Digite <span className="font-mono">EXCLUIR</span> para confirmar
          </span>
          <input
            value={confirmDelete}
            onChange={(e) => setConfirmDelete(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="EXCLUIR"
            aria-describedby="delete-hint"
          />
          <span id="delete-hint" className="text-xs text-muted-foreground">
            Passo extra para evitar cliques acidentais.
          </span>
        </label>

        <button
          type="button"
          onClick={() => submit("delete")}
          disabled={busy !== null}
          className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
        >
          {busy === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4" aria-hidden />
          )}
          Confirmar exclusão de dados
        </button>
      </section>

      <section aria-labelledby="hist-h" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="hist-h" className="text-lg font-semibold">
            Suas solicitações
          </h2>
          {activeCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {activeCount} em andamento — atualiza automaticamente
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não fez solicitações.
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => {
              const meta = STATUS_META[r.status];
              const Icon = meta.icon;
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3"
                >
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    {r.kind === "export" ? (
                      <Download className="h-4 w-4" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-medium">
                      {r.kind === "export"
                        ? `Exportação (${(r.format ?? "json").toUpperCase()})`
                        : "Exclusão de conta"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aberta em {new Date(r.created_at).toLocaleString("pt-BR")}
                      {r.completed_at
                        ? ` · concluída em ${new Date(r.completed_at).toLocaleString("pt-BR")}`
                        : ""}
                    </p>
                    {r.error && (
                      <p className="text-xs text-rose-300 mt-1">Erro: {r.error}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${meta.className}`}
                    aria-live="polite"
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${r.status === "processing" ? "animate-spin" : ""}`}
                      aria-hidden
                    />
                    {meta.label}
                  </span>
                  {r.kind === "export" && r.status === "completed" && r.file_path && (
                    <button
                      type="button"
                      onClick={() => download(r.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden /> Baixar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
