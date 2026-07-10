import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/admin/login")({
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if ((roles ?? []).some((r) => r.role === "admin")) navigate({ to: "/admin" });
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
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
      navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
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
          <p className="text-xs text-muted-foreground">Acesso restrito</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
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
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">← voltar ao início</Link>
        </p>
      </div>
    </main>
  );
}
