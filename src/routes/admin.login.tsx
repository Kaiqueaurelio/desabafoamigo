import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

type Step = "password" | "totp";

function AdminLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || data.user.is_anonymous) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (!(roles ?? []).some((r) => r.role === "admin")) return;
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2" || aal?.nextLevel !== "aal2") {
        navigate({ to: "/admin" });
      }
    })();
  }, [navigate]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPassword = password.trim();
      await supabase.auth.signOut();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });
      if (error) throw error;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user!.id);
      if (!(roles ?? []).some((r) => r.role === "admin")) {
        await supabase.auth.signOut();
        throw new Error("Este usuário não é administrador.");
      }

      // Verifica se já tem TOTP inscrito
      const { data: list } = await supabase.auth.mfa.listFactors();
      const verified = (list?.totp ?? []).filter((f) => f.status === "verified");
      if (verified.length === 0) {
        // Sem 2FA -> força inscrição
        navigate({ to: "/admin/mfa" });
        return;
      }
      const factor = verified[0];
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (chErr) throw chErr;
      setFactorId(factor.id);
      setChallengeId(ch.id);
      setStep("totp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || !challengeId) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: code.trim(),
      });
      if (error) throw error;
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-soft px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center">
          <Logo size={56} />
          <h1 className="mt-3 text-xl font-semibold text-primary">Área administrativa</h1>
          <p className="text-xs text-muted-foreground">Acesso restrito • 2FA obrigatório</p>
        </div>

        {step === "password" ? (
          <form onSubmit={submitPassword} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Entrando…" : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitTotp} className="space-y-4">
            <div className="rounded-lg bg-brand-soft p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
              Digite o código de 6 dígitos do seu app autenticador.
            </div>
            <input
              id="totp"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-lg tracking-[0.5em] outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
              {loading ? "Validando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("password");
                setCode("");
                setError(null);
              }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Voltar
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/">Voltar ao início</Link>
        </p>
      </div>
    </main>
  );
}
