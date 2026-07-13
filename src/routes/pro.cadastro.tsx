import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { z } from "zod";

export const Route = createFileRoute("/pro/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro de voluntário(a) — Desabafa Amigo" }] }),
  component: ProSignup,
});

const schema = z.object({
  full_name: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  specialty: z.string().trim().min(2).max(80),
  bio: z.string().trim().min(20, "Escreva ao menos 20 caracteres").max(600),
  credentials: z.string().trim().min(3, "Informe sua formação").max(200),
  motivation: z.string().trim().min(10).max(600),
});

function ProSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", specialty: "", bio: "", credentials: "", motivation: "",
  });

  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const parsed = schema.safeParse(form);
    if (!parsed.success) { setErr(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const { data: signup, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { emailRedirectTo: `${window.location.origin}/pro`, data: { display_name: form.full_name } },
      });
      if (error) throw error;
      const userId = signup.user?.id;
      if (!userId) throw new Error("Não foi possível criar a conta");

      const { error: vErr } = await supabase.from("volunteers").insert({
        user_id: userId,
        display_alias: form.full_name,
        full_name: form.full_name,
        email: form.email,
        specialty: form.specialty,
        bio: form.bio,
        credentials: form.credentials,
        motivation: form.motivation,
        approval_status: "pending",
      });

      if (vErr) throw vErr;
      setOk(true);
      setTimeout(() => navigate({ to: "/auth" }), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  if (ok) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-brand-soft px-4">
        <div className="max-w-md rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-calm)]">
          <h1 className="text-xl font-semibold text-primary">Cadastro enviado ✅</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua inscrição foi enviada para análise. Você será notificado por e-mail quando for aprovado.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-brand-soft px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl bg-card p-8 shadow-[var(--shadow-calm)]">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <Logo size={28} />
          <span className="text-sm font-semibold text-primary">Desabafa Amigo</span>
        </Link>
        <h1 className="text-2xl font-bold text-primary">Cadastro de voluntário(a)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Após envio, um administrador irá revisar e aprovar seu cadastro. Só então você aparecerá para quem busca escuta.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
          <Field label="Nome completo"><input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="inp" /></Field>
          <Field label="E-mail"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="inp" /></Field>
          <Field label="Senha"><PasswordInput value={form.password} onChange={(v) => set("password", v)} autoComplete="new-password" className="inp pr-10" /></Field>
          <Field label="Especialidade / área"><input placeholder="Ex.: Escuta ativa, apoio emocional" value={form.specialty} onChange={(e) => set("specialty", e.target.value)} className="inp" /></Field>
          <Field label="Formação / experiência" full><input value={form.credentials} onChange={(e) => set("credentials", e.target.value)} className="inp" /></Field>
          <Field label="Biografia (visível para quem busca escuta)" full><textarea rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} className="inp" /></Field>
          <Field label="Por que quer participar?" full><textarea rows={3} value={form.motivation} onChange={(e) => set("motivation", e.target.value)} className="inp" /></Field>

          {err && <p className="col-span-full text-sm text-destructive">{err}</p>}
          <button disabled={busy} type="submit" className="btn-primary col-span-full">
            {busy ? "Enviando..." : "Enviar cadastro"}
          </button>
        </form>
      </div>
      <style>{`.inp{width:100%;border-radius:0.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--color-primary);box-shadow:0 0 0 2px color-mix(in oklch,var(--color-ring) 40%,transparent)}`}</style>
    </main>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
