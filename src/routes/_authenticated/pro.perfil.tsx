import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureProAal2 } from "@/lib/proGuard";

export const Route = createFileRoute("/_authenticated/pro/perfil")({
  beforeLoad: async ({ context }) => {
    if (!context.isPro) throw redirect({ to: "/inicio" });
    await ensureProAal2();
  },
  component: ProProfile,
});

function ProProfile() {
  const [form, setForm] = useState({ full_name: "", specialty: "", bio: "", photo_url: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("volunteers").select("full_name, specialty, bio, photo_url").eq("user_id", u.user.id).maybeSingle();
      if (data) setForm({
        full_name: data.full_name ?? "", specialty: data.specialty ?? "",
        bio: data.bio ?? "", photo_url: data.photo_url ?? "",
      });
    })();
  }, []);

  async function save() {
    setBusy(true); setMsg("");
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("volunteers").update(form).eq("user_id", u.user.id);
      if (error) throw error;
      setMsg("Perfil atualizado ✔");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erro"); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-primary">Meu perfil de voluntário(a)</h1>
      <p className="mt-1 text-sm text-muted-foreground">Essas informações aparecem para quem busca uma conversa.</p>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
        <Field label="Nome exibido"><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="inp" /></Field>
        <Field label="Especialidade"><input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="inp" /></Field>
        <Field label="URL da foto (opcional)"><input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} className="inp" placeholder="https://..." /></Field>
        <Field label="Biografia"><textarea rows={5} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="inp" /></Field>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <button onClick={save} disabled={busy} className="btn-primary">{busy ? "Salvando..." : "Salvar"}</button>
      </div>
      <style>{`.inp{width:100%;border-radius:0.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:0.5rem 0.75rem;font-size:0.875rem;outline:none}.inp:focus{border-color:var(--color-primary)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
