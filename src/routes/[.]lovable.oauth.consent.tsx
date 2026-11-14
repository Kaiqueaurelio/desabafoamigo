import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ShieldCheck, XCircle } from "lucide-react";

// Wrapper tipado para a API beta `supabase.auth.oauth`.
type OAuthClient = { name?: string; client_uri?: string; logo_uri?: string };
type OAuthDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: OAuthDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: Error | null;
  }>;
  denyAuthorization: (id: string) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: Error | null;
  }>;
};
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Parâmetro authorization_id ausente.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(id);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return null;
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-dvh items-center justify-center bg-brand-soft px-4">
      <div className="max-w-md rounded-3xl bg-card p-8 text-sm text-muted-foreground shadow-[var(--shadow-calm)]">
        Não foi possível carregar essa autorização: {String((error as Error)?.message ?? error)}
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<null | "approve" | "deny">(null);
  const [err, setErr] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setErr(null);
    setBusy(approve ? "approve" : "deny");
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setErr(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setErr("O servidor de autorização não retornou um destino de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "esse aplicativo";
  const rawScope = typeof details?.scope === "string" ? details.scope : "";
  const scopes: string[] = rawScope.split(/\s+/).filter((s: string) => s.length > 0);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand-soft px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-[var(--shadow-calm)]">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-sm font-semibold text-primary">Desabafo Amigo</span>
        </div>
        <h1 className="mt-6 text-xl font-semibold text-foreground">
          Conectar {clientName} à sua conta
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Isso permite que <strong className="text-foreground">{clientName}</strong> use as
          ferramentas habilitadas do Desabafo Amigo como você. As políticas de acesso do app
          continuam decidindo o que pode ser lido ou alterado.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl bg-brand-soft/60 p-4 text-sm">
          <p className="flex items-start gap-2 text-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              O app não recebe sua senha nem tokens. Você pode revogar o acesso a qualquer momento
              nas configurações da conta.
            </span>
          </p>
          {scopes.length > 0 && (
            <ul className="ml-6 list-disc space-y-1 text-xs text-muted-foreground">
              {scopes.map((s) => (
                <li key={s}>{humanScope(s)}</li>
              ))}
            </ul>
          )}
          {details?.redirect_uri && (
            <p className="text-[11px] text-muted-foreground">
              Após aprovar, você volta para <code>{details.redirect_uri}</code>.
            </p>
          )}
        </div>

        {err && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-destructive">
            <XCircle className="mt-0.5 size-4 shrink-0" /> {err}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => decide(false)}
            className="rounded-xl border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-60"
          >
            {busy === "deny" ? "Cancelando…" : "Cancelar"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => decide(true)}
            className="btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-60"
          >
            {busy === "approve" ? "Conectando…" : "Aprovar acesso"}
          </button>
        </div>
      </div>
    </main>
  );
}

function humanScope(s: string): string {
  if (s === "openid") return "Confirmar sua identidade";
  if (s === "email") return "Compartilhar seu e-mail";
  if (s === "profile") return "Compartilhar seu perfil básico";
  return `Permissão adicional: ${s}`;
}
