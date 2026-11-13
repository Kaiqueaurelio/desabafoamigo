import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, ShieldCheck, UserRoundCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/finalizar-cadastro")({
  component: FinishRegistrationPage,
});

function FinishRegistrationPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) return;
      if (userError || !data.user) {
        setError("Não foi possível identificar sua sessão. Entre novamente para continuar.");
      } else {
        setIsAnonymous(data.user.is_anonymous === true);
        if (data.user.email) setEmail(data.user.email);
      }
      setChecking(false);
    };
    void loadUser();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !session?.user) return;
      setIsAnonymous(session.user.is_anonymous === true);
      if (session.user.email) setEmail(session.user.email);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function requestEmailLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Digite um e-mail válido.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser(
        { email: normalizedEmail },
        { emailRedirectTo: `${window.location.origin}/finalizar-cadastro` },
      );
      if (updateError) throw updateError;
      setMessage("Enviamos um link de confirmação para seu e-mail. Abra a mensagem neste aparelho para continuar e manter suas conversas nesta mesma conta.");
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : "Não foi possível enviar o link de confirmação.";
      const lower = raw.toLowerCase();
      if (lower.includes("manual") || lower.includes("identity")) {
        setError("A vinculação de identidade ainda precisa ser habilitada nas configurações de autenticação do projeto. Tente novamente mais tarde.");
      } else if (lower.includes("already") || lower.includes("registered")) {
        setError("Esse e-mail já está associado a outra conta. Saia da sessão e entre na conta existente; não criaremos outra conta para evitar separar seus dados.");
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Cadastro concluído! Seu acesso agora pode ser recuperado pelo e-mail e senha.");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => navigate({ to: "/inicio" }), 1400);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar sua senha.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="mx-auto max-w-xl p-6 text-sm text-muted-foreground">Verificando sua sessão...</div>;
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-2xl items-center justify-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-calm sm:p-8">
        <Link to="/inicio" className="mb-6 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar ao início
        </Link>
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-brand-soft text-primary">
          {isAnonymous ? <UserRoundCheck className="size-7" /> : <ShieldCheck className="size-7" />}
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-green">Sua conta, no seu tempo</p>
        <h1 className="mt-2 text-2xl font-bold text-primary sm:text-3xl">
          {isAnonymous ? "Quer continuar de onde parou?" : "Só falta definir sua senha"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {isAnonymous
            ? "Você começou como visitante. Ao confirmar seu e-mail, vinculamos essa identidade à mesma conta — suas conversas e dados associados continuam com você. Assim, poderá entrar novamente em outro aparelho."
            : "Seu e-mail já foi confirmado. Crie uma senha para concluir o cadastro e conseguir acessar sua conta novamente."}
        </p>

        {isAnonymous ? (
          <form onSubmit={requestEmailLink} className="mt-7 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Seu melhor e-mail</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@exemplo.com" className="min-h-12 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </span>
            </label>
            <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
              <Mail className="size-4" /> {loading ? "Enviando..." : "Enviar link de confirmação"}
            </button>
            <p className="text-xs leading-relaxed text-muted-foreground">Não vamos criar uma conta separada: o objetivo é preservar esta sessão e vinculá-la ao seu e-mail.</p>
          </form>
        ) : (
          <form onSubmit={savePassword} className="mt-7 space-y-4">
            <div className="rounded-xl bg-brand-soft/60 p-3 text-sm">
              <span className="font-medium">E-mail confirmado:</span> {email || "confirmação concluída"}
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Criar senha</span>
              <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres" className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Confirmar senha</span>
              <input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite a senha novamente" className="min-h-12 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
              <ShieldCheck className="size-4" /> {loading ? "Salvando..." : "Concluir meu cadastro"}
            </button>
          </form>
        )}

        {message && <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      </section>
    </div>
  );
}
