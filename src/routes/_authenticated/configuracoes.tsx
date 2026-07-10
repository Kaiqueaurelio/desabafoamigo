import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { ShieldCheck, Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const del = useServerFn(deleteMyAccount);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleDelete() {
    if (confirm !== "APAGAR") { setErr("Digite APAGAR para confirmar."); return; }
    setBusy(true); setErr(null);
    try {
      await del();
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch (e) {
      setErr((e as Error).message ?? "Não foi possível apagar agora.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <p className="mt-2 text-sm text-muted-foreground">Controle sua privacidade e sua conta.</p>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="font-medium">Privacidade e segurança</h2>
            <p className="mt-1 text-sm text-muted-foreground">Saiba o que coletamos, por quanto tempo guardamos e como protegemos suas conversas.</p>
            <a href="/privacidade" target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Ler política de privacidade <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 size-5 text-destructive" />
          <div className="flex-1">
            <h2 className="font-medium text-destructive">Apagar minha conta</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Remove sua conta, mensagens, diário, avaliações e resumos. A ação é imediata e irreversível (LGPD art. 18).
            </p>
            <label className="mt-3 block text-xs text-muted-foreground">Digite <b>APAGAR</b> para confirmar</label>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="APAGAR"
            />
            {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
            <button
              onClick={handleDelete}
              disabled={busy || confirm !== "APAGAR"}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
            >
              <Trash2 className="size-4" /> {busy ? "Apagando…" : "Apagar minha conta"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
