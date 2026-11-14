import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Flag } from "lucide-react";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { CardListSkeleton } from "@/components/AdminSkeletons";

export const Route = createFileRoute("/admin/denuncias")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAdminAal2();
  },
  component: Denuncias,
});

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  appointment_id: string | null;
  reason: string;
  details: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

const STATUS_LABEL: Record<Report["status"], string> = {
  open: "Aberta",
  reviewing: "Em análise",
  resolved: "Resolvida",
  dismissed: "Arquivada",
};
const STATUS_TAB = ["open", "reviewing", "resolved", "dismissed"] as const;

function Denuncias() {
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<Report["status"]>("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports((data ?? []) as Report[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function updateStatus(r: Report, status: Report["status"], notes?: string) {
    setBusy(r.id);
    await supabase
      .from("reports")
      .update({
        status,
        admin_notes: notes ?? r.admin_notes,
        resolved_at:
          status === "resolved" || status === "dismissed" ? new Date().toISOString() : null,
      })
      .eq("id", r.id);
    setBusy(null);
    await load();
  }

  const filtered = reports.filter((r) => r.status === tab);
  const counts = STATUS_TAB.reduce(
    (acc, s) => ({ ...acc, [s]: reports.filter((r) => r.status === s).length }),
    {} as Record<Report["status"], number>,
  );

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <Link
            to="/admin"
            aria-label="Voltar"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Flag className="size-5 text-destructive" />
          <h1 className="text-lg font-semibold text-foreground">Denúncias</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_TAB.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`rounded-full px-4 py-1.5 text-sm ${tab === s ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted"}`}
            >
              {STATUS_LABEL[s]} · {counts[s] ?? 0}
            </button>
          ))}
        </div>

        {loading ? (
          <CardListSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma denúncia nesta categoria.
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{r.reason}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                      {r.appointment_id && (
                        <>
                          {" "}
                          · conversa{" "}
                          <code className="rounded bg-muted px-1">
                            {r.appointment_id.slice(0, 8)}
                          </code>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                {r.details && (
                  <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm text-foreground">
                    {r.details}
                  </p>
                )}
                {r.admin_notes && (
                  <p className="mt-2 text-xs text-muted-foreground">Notas: {r.admin_notes}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.status !== "reviewing" &&
                    r.status !== "resolved" &&
                    r.status !== "dismissed" && (
                      <button
                        disabled={busy === r.id}
                        onClick={() => updateStatus(r, "reviewing")}
                        className="rounded-full border border-border px-3 py-1 text-xs"
                      >
                        Marcar em análise
                      </button>
                    )}
                  {r.status !== "resolved" && (
                    <button
                      disabled={busy === r.id}
                      onClick={() => {
                        const n = prompt("Notas da resolução (opcional):", r.admin_notes ?? "");
                        updateStatus(r, "resolved", n ?? r.admin_notes ?? undefined);
                      }}
                      className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    >
                      Resolver
                    </button>
                  )}
                  {r.status !== "dismissed" && (
                    <button
                      disabled={busy === r.id}
                      onClick={() => updateStatus(r, "dismissed")}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                    >
                      Arquivar
                    </button>
                  )}
                  {r.appointment_id && (
                    <Link
                      to="/consulta/$id"
                      params={{ id: r.appointment_id }}
                      className="rounded-full border border-border px-3 py-1 text-xs"
                    >
                      Abrir conversa
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
