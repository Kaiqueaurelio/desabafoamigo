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
  const [fullName, setFullName] = useState("");
  const [isPsychologist, setIsPsychologist] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [availability, setAvailability] = useState("");
  const [credentials, setCredentials] = useState("");
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
      await supabase.auth.signOut();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/voluntario` },
        });
        if (error) throw error;
        const userId = data.user?.id;
        if (userId) {
          await supabase.from("volunteers").upsert(
            {
              user_id: userId,
              full_name: fullName,
              email,
              is_psychologist: isPsychologist,
              motivation,
              experience,
              availability,
              credentials,
              approval_status: "pending",
              status: "offline",
            },
            { onConflict: "user_id" },
          );
        }
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
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center">
          <Logo size={56} />
          <h1 className="mt-3 text-xl font-semibold text-primary">Área do voluntário</h1>
          <p className="text-xs text-muted-foreground">
            {mode === "signup" ? "Envie sua inscrição para análise" : "Somente voluntários aprovados"}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <Input label="Nome completo" value={fullName} onChange={setFullName} required />
          )}
          <Input label="E-mail" type="email" value={email} onChange={setEmail} required />
          <Input label="Senha" type="password" value={password} onChange={setPassword} required minLength={8} />

          {mode === "signup" && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPsychologist}
                  onChange={(e) => setIsPsychologist(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                Sou psicólogo(a) registrado(a)
              </label>
              <Textarea label="Por que quer ser voluntário?" value={motivation} onChange={setMotivation} required />
              <Textarea label="Experiência prévia com escuta / apoio" value={experience} onChange={setExperience} />
              <Textarea label="Disponibilidade (dias/horários)" value={availability} onChange={setAvailability} />
              <Textarea
                label={isPsychologist ? "Registro profissional (CRP) e formação" : "Formação / credenciais (opcional)"}
                value={credentials}
                onChange={setCredentials}
                required={isPsychologist}
              />
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Carregando…" : mode === "signin" ? "Entrar" : "Enviar inscrição"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary"
        >
          {mode === "signin" ? "Sou voluntário novo — inscrever-me" : "Já tenho conta — entrar"}
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

function Input({
  label, type = "text", value, onChange, required, minLength,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; required?: boolean; minLength?: number }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
      <textarea
        required={required}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
      />
    </div>
  );
}
