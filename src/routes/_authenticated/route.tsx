import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const redirectToLogin = () =>
      redirect({ to: "/auth", search: { next: location.pathname } });

    let data: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"];
    let error: Awaited<ReturnType<typeof supabase.auth.getUser>>["error"];

    try {
      const result = await supabase.auth.getUser();
      data = result.data;
      error = result.error;
    } catch (cause) {
      console.error("[AuthGuard] Falha ao consultar a sessão:", cause);
      throw redirectToLogin();
    }

    // A área de apoio é acessível sem cadastro. Se não existir sessão,
    // tentamos criar uma sessão anônima; falhas devem levar ao login, não à tela global.
    if (!error && !data.user) {
      try {
        const guest = await supabase.auth.signInAnonymously();
        if (guest.error || !guest.data.user) throw guest.error ?? new Error("Sessão de convidado indisponível");
        data = { user: guest.data.user };
      } catch (cause) {
        console.warn("[AuthGuard] Não foi possível criar sessão de convidado:", cause);
        throw redirectToLogin();
      }
    }

    if (error || !data.user) throw redirectToLogin();

    // Sessões anônimas podem usar recursos de acolhimento, mas não a área de voluntários.
    const isAnonymous = data.user.is_anonymous === true;
    if (isAnonymous && location.pathname.startsWith("/pro")) throw redirectToLogin();

    // A falha ao consultar papéis não concede privilégios: o usuário segue como
    // usuário comum até que o banco confirme explicitamente uma role privilegiada.
    let roles: Array<{ role: string }> = [];
    try {
      const result = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (result.error) {
        console.warn("[AuthGuard] Consulta de permissões indisponível; aplicando menor privilégio.");
      } else {
        roles = (result.data ?? []) as Array<{ role: string }>;
      }
    } catch (cause) {
      console.warn("[AuthGuard] Falha na consulta de permissões; aplicando menor privilégio:", cause);
    }

    const isPro = roles.some((r) => r.role === "volunteer");
    const isAdmin = roles.some((r) => r.role === "admin");
    return { user: data.user, isPro, isAdmin, isAnonymous };
  },
  component: LayoutRoute,
});

function LayoutRoute() {
  const ctx = Route.useRouteContext();
  return (
    <AppShell user={ctx.user} isPro={ctx.isPro} isAdmin={ctx.isAdmin}>
      <Outlet />
    </AppShell>
  );
}
