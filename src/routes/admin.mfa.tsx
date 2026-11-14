import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/mfa")({
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
    if (!roles || roles.length === 0) throw redirect({ to: "/admin/login" });
  },
  component: AdminMfa,
});

function AdminMfa() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [already, setAlready] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Se já tem fator verificado, apenas informa (não re-inscreve)
        const { data: list } = await supabase.auth.mfa.listFactors();
        const verified = (list?.totp ?? []).filter((f) => f.status === "verified");
        if (verified.length > 0) {
          setAlready(true);
          setLoading(false);
          return;
        }
        // Remove fatores não verificados órfãos para evitar erro de duplicidade
        for (const f of list?.totp ?? []) {
          if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: `admin-${Date.now()}`,
        });
        if (error) throw error;
        setFactorId(data.id);
        setSecret(data.totp.secret);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao iniciar MFA.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (vErr) throw vErr;
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-soft px-6 py-10">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="mt-3 flex items-center gap-2 text-xl font-semibold text-primary">
            <ShieldCheck className="h-5 w-5" /> Verificação em duas etapas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Obrigatória para acessar o painel administrativo.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : already ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-foreground">
              Sua conta já tem 2FA ativo. Faça login novamente para validar o código.
            </p>
            <Link to="/admin/login" className="btn-primary inline-block w-full">
              Ir para o login
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
              <li>Abra um app autenticador (Google Authenticator, Authy, 1Password…).</li>
              <li>Copie a chave abaixo e adicione manualmente no app autenticador.</li>
              <li>Digite o código de 6 dígitos gerado pelo app.</li>
            </ol>

            {secret && (
              <div className="rounded-lg border border-border bg-muted p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Chave manual</p>
                <code className="block select-all break-all text-sm text-foreground">{secret}</code>
              </div>
            )}

            <form onSubmit={verify} className="space-y-3">
              <label htmlFor="code" className="block text-sm font-medium text-foreground">
                Código de 6 dígitos
              </label>
              <input
                id="code"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="btn-primary w-full"
              >
                {busy ? "Validando…" : "Ativar e entrar"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
