import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/voluntario/login")({
  component: VolunteerLogin,
});

function VolunteerLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !data.user.is_anonymous) navigate({ to: "/voluntario" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Ensure we're not carrying an anonymous session
      await supabase.auth.signOut();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/voluntario` },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/voluntario" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-soft px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center">
          <Logo size={56} />
          <h1 className="mt-3 text-xl font-semibold text-primary">Área do voluntário</h1>
          <p className="text-xs text-muted-foreground">Somente voluntários aprovados</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">E-mail</label>
            <input
              id="email"
              type="email"
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
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Carregando…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary"
        >
          {mode === "signin" ? "Sou voluntário novo — criar conta" : "Já tenho conta — entrar"}
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">← voltar</Link>
        </p>
        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          O acesso completo depende de aprovação por um administrador.
        </p>
      </div>
    </main>
  );
}
