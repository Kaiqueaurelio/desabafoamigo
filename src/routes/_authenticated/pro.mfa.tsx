import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pro/mfa")({
  beforeLoad: ({ context }) => {
    if (!context.isPro) throw redirect({ to: "/inicio" });
  },
  component: ProMfa,
});

type Mode = "loading" | "enroll" | "challenge";

function ProMfa() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: list } = await supabase.auth.mfa.listFactors();
        const verified = (list?.totp ?? []).filter((f) => f.status === "verified");
        if (verified.length > 0) {
          // já inscrito -> desafiar
          const factor = verified[0];
          const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
          if (chErr) throw chErr;
          setFactorId(factor.id);
          setChallengeId(ch.id);
          setMode("challenge");
          return;
        }
        // limpa fatores pendentes órfãos
        for (const f of list?.totp ?? []) {
          if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: `pro-${Date.now()}`,
        });
        if (error) throw error;
        setFactorId(data.id);
        setSecret(data.totp.secret);
        const url = await QRCode.toDataURL(data.totp.uri, { margin: 1, width: 220 });
        setQrDataUrl(url);
        setMode("enroll");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao iniciar 2FA.");
        setMode("enroll");
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    try {
      let chId = challengeId;
      if (!chId) {
        const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
        if (chErr) throw chErr;
        chId = ch.id;
      }
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: chId,
        code: code.trim(),
      });
      if (error) throw error;
      navigate({ to: "/pro" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10">
      <div className="w-full rounded-2xl bg-card p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="rounded-full bg-brand-soft p-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-primary">Verificação em duas etapas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "challenge"
              ? "Digite o código do seu app autenticador para continuar."
              : "Ative agora para acessar o painel de voluntário(a)."}
          </p>
        </div>

        {mode === "loading" ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {mode === "enroll" && (
              <div className="space-y-4">
                <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
                  <li>Abra um app autenticador (Google Authenticator, Authy, 1Password…).</li>
                  <li>Escaneie o QR code ou insira a chave manualmente.</li>
                  <li>Digite abaixo o código de 6 dígitos gerado.</li>
                </ol>
                {qrDataUrl && (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={qrDataUrl}
                      alt="QR Code para autenticador"
                      className="rounded-lg border border-border bg-white p-2"
                      width={220}
                      height={220}
                    />
                    {secret && (
                      <code className="select-all break-all rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {secret}
                      </code>
                    )}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={submit} className="mt-5 space-y-3">
              <label htmlFor="code" className="block text-sm font-medium text-foreground">
                Código de 6 dígitos
              </label>
              <input
                id="code"
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
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="btn-primary w-full"
              >
                {busy ? "Validando…" : mode === "challenge" ? "Entrar" : "Ativar e entrar"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
