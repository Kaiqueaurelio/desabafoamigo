import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Loader2, LogOut, Check, X, Users, Clock, MessageCircleHeart, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) {
      throw redirect({ to: "/admin/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminDashboard,
});


type Volunteer = {
  user_id: string;
  display_alias: string;
  status: string;
  approval_status: "pending" | "approved" | "rejected";
  full_name: string | null;
  email: string | null;
  motivation: string | null;
  experience: string | null;
  availability: string | null;
  credentials: string | null;
  rejection_reason: string | null;
  applied_at: string;
  reviewed_at: string | null;
};

type Tab = "pending" | "approved" | "rejected";



function AdminDashboard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<Volunteer | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ conversations: 0, appointments: 0, upcoming: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || data.user.is_anonymous) {
        navigate({ to: "/admin/login" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (!(roles ?? []).some((r) => r.role === "admin")) {
        navigate({ to: "/admin/login" });
        return;
      }
      setChecking(false);
      await refresh();
    })();
  }, [navigate]);

  async function refresh() {
    const { data: vols } = await supabase
      .from("volunteers")
      .select("*")
      .order("applied_at", { ascending: false });
    setVolunteers((vols ?? []) as Volunteer[]);

    const [{ count: c1 }, { count: c2 }, { count: c3 }] = await Promise.all([
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      supabase.from("appointments").select("*", { count: "exact", head: true }),
      supabase.from("appointments").select("*", { count: "exact", head: true }).in("status", ["scheduled", "in_progress"]),
    ]);
    setStats({ conversations: c1 ?? 0, appointments: c2 ?? 0, upcoming: c3 ?? 0 });
  }

  const filtered = useMemo(
    () => volunteers.filter((v) => v.approval_status === tab),
    [volunteers, tab],
  );

  async function approve(v: Volunteer) {
    setBusy(true);
    try {
      // Grant role — trigger updates volunteers row to approved
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: v.user_id, role: "volunteer" });
      if (roleErr && !roleErr.message.includes("duplicate")) throw roleErr;
      // Ensure approval status set even if role already existed
      await supabase
        .from("volunteers")
        .update({ approval_status: "approved", reviewed_at: new Date().toISOString(), rejection_reason: null })
        .eq("user_id", v.user_id);
      setSelected(null);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao aprovar.");
    } finally {
      setBusy(false);
    }
  }

  async function reject(v: Volunteer) {
    setBusy(true);
    try {
      await supabase
        .from("volunteers")
        .update({
          approval_status: "rejected",
          rejection_reason: rejectReason || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("user_id", v.user_id);
      // Revoke any existing role
      await supabase.from("user_roles").delete().eq("user_id", v.user_id).eq("role", "volunteer");
      setSelected(null);
      setRejectReason("");
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao rejeitar.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  }

  if (checking) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </main>
    );
  }

  const counts = {
    pending: volunteers.filter((v) => v.approval_status === "pending").length,
    approved: volunteers.filter((v) => v.approval_status === "approved").length,
    rejected: volunteers.filter((v) => v.approval_status === "rejected").length,
  };

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-semibold text-primary">Painel administrativo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xs text-muted-foreground hover:text-primary">Ir ao app</Link>
            <button onClick={signOut} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
              <LogOut className="size-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-primary">Central de atendimento</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Acompanhe conversas em tempo real e atenda quando necessário.</p>
            </div>
            <Link to="/admin/atendimento" className="btn-primary shrink-0 text-center text-sm">Abrir</Link>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-destructive">Denúncias</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Analise relatos enviados por usuários e voluntários.</p>
            </div>
            <Link to="/admin/denuncias" className="shrink-0 rounded-full bg-destructive px-4 py-2 text-center text-sm font-semibold text-destructive-foreground">Ver denúncias</Link>
          </div>
        </div>

        {/* Stats */}
        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Clock className="size-5 text-brand-green" />} label="Pendentes" value={counts.pending} />
          <StatCard icon={<ShieldCheck className="size-5 text-brand-green" />} label="Voluntários ativos" value={counts.approved} />
          <StatCard icon={<MessageCircleHeart className="size-5 text-brand-green" />} label="Conversas totais" value={stats.appointments} />
          <StatCard icon={<Users className="size-5 text-brand-green" />} label="Conversas ativas" value={stats.upcoming} />

        </section>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                tab === t ? "bg-primary text-primary-foreground shadow" : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {t === "pending" ? "Pendentes" : t === "approved" ? "Aprovados" : "Rejeitados"} ({counts[t]})
            </button>
          ))}
        </div>

        {/* Table */}
        <section className="rounded-2xl bg-card p-5 shadow-sm">
          {filtered.length === 0 ? (
            <p className="rounded-lg bg-brand-soft p-4 text-sm text-muted-foreground">
              Nenhum voluntário nesta categoria.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Nome</th>
                    <th className="py-2 pr-4">E-mail</th>
                    <th className="py-2 pr-4">Tipo</th>
                    <th className="py-2 pr-4">Inscrição</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v) => (
                    <tr key={v.user_id} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-medium text-foreground">{v.full_name || v.display_alias || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{v.email || "—"}</td>
                      <td className="py-3 pr-4">Voluntário(a)</td>
                      <td className="py-3 pr-4 text-muted-foreground">{new Date(v.applied_at).toLocaleDateString()}</td>
                      <td className="py-3 pr-4">
                        <StatusPill status={v.approval_status} />
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <button onClick={() => setSelected(v)} className="text-xs font-medium text-primary hover:underline">
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary">{selected.full_name || selected.display_alias}</h3>
                <p className="text-xs text-muted-foreground">{selected.email}</p>
              </div>
              <StatusPill status={selected.approval_status} />
            </div>

            <dl className="space-y-3 text-sm">
              <Field label="Tipo">Voluntário(a) treinado(a)</Field>
              <Field label="Motivação">{selected.motivation || "—"}</Field>
              <Field label="Experiência">{selected.experience || "—"}</Field>
              <Field label="Disponibilidade">{selected.availability || "—"}</Field>
              <Field label="Credenciais / formação">{selected.credentials || "—"}</Field>
              <Field label="Inscrito em">{new Date(selected.applied_at).toLocaleString()}</Field>
              {selected.rejection_reason && <Field label="Motivo da rejeição">{selected.rejection_reason}</Field>}
            </dl>

            {selected.approval_status === "pending" && (
              <div className="mt-6 space-y-3">
                <textarea
                  placeholder="Motivo da rejeição (opcional)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(selected)}
                    disabled={busy}
                    className="btn-primary flex flex-1 items-center justify-center gap-1"
                  >
                    <Check className="size-4" /> Aprovar
                  </button>
                  <button
                    onClick={() => reject(selected)}
                    disabled={busy}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
                  >
                    <X className="size-4" /> Rejeitar
                  </button>
                </div>
              </div>
            )}

            {selected.approval_status === "approved" && (
              <div className="mt-6">
                <button
                  onClick={() => reject(selected)}
                  disabled={busy}
                  className="w-full rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
                >
                  Revogar aprovação
                </button>
              </div>
            )}

            {selected.approval_status === "rejected" && (
              <div className="mt-6">
                <button onClick={() => approve(selected)} disabled={busy} className="btn-primary w-full">
                  Aprovar mesmo assim
                </button>
              </div>
            )}

            <button onClick={() => setSelected(null)} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary">
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        {icon} <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{children}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { label: "Pendente", cls: "bg-amber-100 text-amber-800" },
    approved: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-800" },
    rejected: { label: "Rejeitado", cls: "bg-red-100 text-red-800" },
  } as const;
  const { label, cls } = map[status];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
