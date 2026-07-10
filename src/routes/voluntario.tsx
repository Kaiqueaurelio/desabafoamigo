import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Loader2, LogOut } from "lucide-react";

export const Route = createFileRoute("/voluntario")({
  component: VolunteerDashboard,
});

type QueueRow = { id: string; user_id: string; alias: string; created_at: string };
type VolStatus = "available" | "busy" | "offline";

function VolunteerDashboard() {
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [approved, setApproved] = useState<boolean | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<"pending" | "approved" | "rejected" | "none">("none");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [status, setStatus] = useState<VolStatus>("offline");
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || user.is_anonymous) {
        navigate({ to: "/voluntario/login" });
        return;
      }
      setMe(user.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isVol = (roles ?? []).some((r) => r.role === "volunteer" || r.role === "psychologist");

      const { data: vol } = await supabase
        .from("volunteers")
        .select("status, approval_status, rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();

      if (vol) {
        setApplicationStatus(vol.approval_status as "pending" | "approved" | "rejected");
        setRejectionReason(vol.rejection_reason);
        setStatus(vol.status as VolStatus);
      }
      setApproved(isVol);
      if (!isVol) return;

      // Any active conversation?
      const { data: active } = await supabase
        .from("conversations")
        .select("id")
        .eq("volunteer_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (active) setActiveConvId(active.id);

      const { data: q } = await supabase
        .from("queue")
        .select("id, user_id, alias, created_at")
        .order("created_at", { ascending: true });
      setQueue((q ?? []) as QueueRow[]);

      channel = supabase
        .channel("queue-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, async () => {
          const { data: q2 } = await supabase
            .from("queue")
            .select("id, user_id, alias, created_at")
            .order("created_at", { ascending: true });
          setQueue((q2 ?? []) as QueueRow[]);
        })
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);


  async function updateStatus(next: VolStatus) {
    if (!me) return;
    setStatus(next);
    await supabase.from("volunteers").upsert({ user_id: me, status: next }, { onConflict: "user_id" });
  }

  async function accept(row: QueueRow) {
    if (!me || accepting) return;
    setAccepting(row.id);
    try {
      // Remove from queue first (both parties allowed)
      const { error: delErr } = await supabase.from("queue").delete().eq("id", row.id);
      if (delErr) throw delErr;
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          user_id: row.user_id,
          volunteer_id: me,
          user_alias: row.alias,
          volunteer_alias: "Voluntário",
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("volunteers").update({ status: "busy" }).eq("user_id", me);
      await supabase.from("metrics").insert({ event: "conversation_started" });
      navigate({ to: "/chat/$id", params: { id: conv.id } });
    } catch (err) {
      console.error(err);
      alert("Não foi possível aceitar. Alguém pode ter atendido antes.");
    } finally {
      setAccepting(null);
    }
  }

  async function signOut() {
    if (me) await supabase.from("volunteers").update({ status: "offline" }).eq("user_id", me);
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (approved === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!approved) {
    const isRejected = applicationStatus === "rejected";
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-brand-soft px-6 text-center">
        <Logo size={64} className="mb-4" />
        <h1 className="text-xl font-semibold text-primary">
          {isRejected ? "Inscrição não aprovada" : "Conta aguardando aprovação"}
        </h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {isRejected
            ? "Sua inscrição foi analisada e não pôde ser aprovada no momento."
            : "Sua inscrição foi recebida e está em análise por um administrador. Você receberá acesso assim que for aprovada."}
        </p>
        {isRejected && rejectionReason && (
          <p className="mt-3 max-w-sm rounded-lg bg-card p-3 text-sm text-foreground">
            <span className="font-medium">Motivo:</span> {rejectionReason}
          </p>
        )}
        <button onClick={signOut} className="mt-6 text-sm text-muted-foreground hover:text-primary">Sair</button>
      </main>
    );
  }


  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-semibold text-primary">Painel do voluntário</span>
          </div>
          <button onClick={signOut} aria-label="Sair" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <section className="mb-6 rounded-2xl bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Seu status</h2>
          <div className="flex flex-wrap gap-2">
            {(["available", "busy", "offline"] as VolStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  status === s
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-secondary text-secondary-foreground hover:bg-muted"
                }`}
              >
                {s === "available" ? "Disponível" : s === "busy" ? "Ocupado" : "Offline"}
              </button>
            ))}
          </div>
        </section>

        {activeConvId && (
          <section className="mb-6 rounded-2xl border-2 border-brand-green bg-card p-5 shadow-sm">
            <p className="mb-3 text-sm text-muted-foreground">Você tem uma conversa em andamento.</p>
            <Link to="/chat/$id" params={{ id: activeConvId }} className="btn-primary inline-block">
              Voltar para a conversa
            </Link>
          </section>
        )}

        <section className="rounded-2xl bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Fila de espera <span className="text-muted-foreground">({queue.length})</span>
          </h2>
          {queue.length === 0 ? (
            <p className="rounded-lg bg-brand-soft p-4 text-sm text-muted-foreground">
              Ninguém aguardando no momento. Obrigado por estar aqui. 💙
            </p>
          ) : (
            <ul className="space-y-2">
              {queue.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{row.alias}</p>
                    <p className="text-xs text-muted-foreground">
                      aguardando desde {new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => accept(row)}
                    disabled={accepting === row.id || status !== "available"}
                    className="btn-primary text-sm disabled:opacity-50"
                    title={status !== "available" ? "Mude seu status para Disponível" : ""}
                  >
                    {accepting === row.id ? "Aceitando…" : "Aceitar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
