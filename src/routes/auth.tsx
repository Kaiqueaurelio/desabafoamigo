import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { PasswordInput } from "@/components/PasswordInput";
import { Sparkles } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Desabafo Amigo" }] }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : "",
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo de 6 caracteres").max(72),
});

// Chave e helpers para "Lembrar-me" (armazenamento local ofuscado; opt-in do usuário).
const REMEMBER_KEY = "desabafo:auth:remember";
type RememberPayload = { email: string };
function encodeRemember(v: RememberPayload): string {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(v)))); } catch { return ""; }
}
function decodeRemember(raw: string | null): RememberPayload | null {
  if (!raw) return null;
  try { return JSON.parse(decodeURIComponent(escape(atob(raw)))) as RememberPayload; } catch { return null; }
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  // Carrega credenciais salvas (se houver) — apenas no cliente.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = decodeRemember(window.localStorage.getItem(REMEMBER_KEY));
    if (saved?.email) {
      // Remove any legacy stored password from older app versions.
      window.localStorage.setItem(REMEMBER_KEY, encodeRemember({ email: saved.email }));
      setEmail(saved.email);
      setMode("signin");
      setRemember(true);
    }
  }, []);


  async function signInAndRoute(normalizedEmail: string, normalizedPassword: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    });
    if (error) throw error;

    const userId = data.user?.id;
    if (!userId) throw new Error("Não foi possível iniciar a sessão.");

    // Consome o redirecionamento preservado (ex.: consentimento OAuth) antes de qualquer outro destino.
    if (next) {
      window.location.assign(next);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = (roles ?? []).some((role) => role.role === "admin");
    if (isAdmin) {
      navigate({ to: "/admin" });
      return;
    }

    navigate({ to: "/inicio" });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.replace(/^\s+|\s+$/g, "");
    const parsed = schema.safeParse({ email: normalizedEmail, password: normalizedPassword });
    if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const emailRedirectTo = next
          ? `${window.location.origin}${next}`
          : `${window.location.origin}/inicio`;
        const { error } = await supabase.auth.signUp({
          email: normalizedEmail, password: normalizedPassword,
          options: { emailRedirectTo },
        });
        if (error) {
          const lower = error.message.toLowerCase();
          if (lower.includes("already registered") || lower.includes("user_already_exists") || lower.includes("already been registered")) {
            await signInAndRoute(normalizedEmail, normalizedPassword);
            persistRemember(normalizedEmail);
            return;
          }
        }
        if (error) throw error;
      } else {
        await signInAndRoute(normalizedEmail, normalizedPassword);
        persistRemember(normalizedEmail);
        return;
      }
      persistRemember(normalizedEmail);
      if (next) {
        window.location.assign(next);
        return;
      }
      navigate({ to: "/inicio" });
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Erro";
      const lower = raw.toLowerCase();
      if (lower.includes("already registered") || lower.includes("user_already_exists") || lower.includes("already been registered")) {
        setMode("signin");
        setErr("Este e-mail já tem cadastro. Tentei entrar com a senha digitada, mas ela não conferiu.");
      } else if (lower.includes("invalid login") || lower.includes("invalid_credentials")) {
        setErr("E-mail ou senha incorretos.");
      } else if (lower.includes("email not confirmed")) {
        setErr("Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.");
      } else if (lower.includes("rate limit") || lower.includes("over_email_send_rate_limit")) {
        setErr("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else {
        setErr(raw);
      }
    } finally { setLoading(false); }
  }

  async function continueAsGuest() {
    setErr("");
    setGuestLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      if (!data.user) throw new Error("Não foi possível iniciar sua sessão de convidado.");
      if (next) {
        window.location.assign(next);
        return;
      }
      navigate({ to: "/inicio" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      const lower = message.toLowerCase();
      if (lower.includes("anonymous") || lower.includes("disabled") || lower.includes("not enabled")) {
        setErr("O acesso como convidado ainda precisa ser ativado nas configurações de autenticação do Supabase. Tente novamente mais tarde.");
      } else {
        setErr(message || "Não foi possível entrar como convidado. Verifique sua conexão e tente novamente.");
      }
    } finally {
      setGuestLoading(false);
    }
  }

  function persistRemember(mail: string) {
    if (typeof window === "undefined") return;
    if (remember) {
      window.localStorage.setItem(REMEMBER_KEY, encodeRemember({ email: mail }));
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }
  }




  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-soft px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-[var(--shadow-calm)]">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <Logo size={28} />
          <span className="text-sm font-semibold text-primary">Desabafo Amigo</span>
        </Link>
        <h1 className="text-2xl font-bold text-primary">
          {mode === "signup" ? "Criar conta" : "Entrar"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Cadastro gratuito. Nenhum nome pessoal é solicitado."
            : "Bem-vindo de volta."}
        </p>

        {mode === "signup" && (
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-brand-soft p-3 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Ao criar sua conta, o app gera automaticamente um <strong>apelido</strong> e um <strong>avatar</strong> para você. Sua identidade não é compartilhada com os voluntários.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-3">
          <Input label="E-mail" type="email" value={email} onChange={setEmail} placeholder="voce@email.com" />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Senha</span>
            <PasswordInput value={password} onChange={setPassword} placeholder="••••••" autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </label>
          <label className="flex items-start gap-2 rounded-lg bg-brand-soft/60 p-2.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
            />
            <span className="min-w-0">
              <strong className="text-foreground">Lembrar de mim neste dispositivo</strong>
              <span className="block text-[11px] opacity-80">
                Salva somente seu e-mail neste dispositivo. A senha nunca é armazenada.
              </span>
            </span>
          </label>
          {err && <p className="text-sm text-destructive">{err}</p>}

          <button disabled={loading} type="submit" className="btn-primary w-full">
            {loading ? "Enviando..." : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <button
          type="button"
          onClick={continueAsGuest}
          disabled={guestLoading || loading}
          className="w-full rounded-xl border border-primary/30 bg-background px-4 py-3 text-sm font-semibold text-primary transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {guestLoading ? "Preparando seu acesso..." : "Entrar como convidado"}
        </button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Sem e-mail e sem senha. Você receberá um apelido automaticamente.
        </p>

        <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary">
          {mode === "signup" ? "Já tenho conta" : "Criar conta"}
        </button>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Quer ser voluntário(a)? <Link to="/pro/cadastro" className="text-primary hover:underline">Cadastre-se aqui</Link>
        </p>
      </div>
    </main>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/40" />
    </label>
  );
}
