import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    let { data, error } = await supabase.auth.getUser();

    // A área de apoio deve ser acessível sem cadastro. Quando não existe sessão,
    // criamos uma sessão anônima do Supabase automaticamente.
    if (!error && !data.user) {
      const guest = await supabase.auth.signInAnonymously();
      if (guest.error || !guest.data.user) {
        throw redirect({ to: "/auth", search: { next: location.pathname } });
      }
      data = { user: guest.data.user };
    }

    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { next: location.pathname } });
    }

    // Sessões anônimas podem usar os recursos de acolhimento, mas não podem
    // acessar a área exclusiva de voluntários.
    const isAnonymous = data.user.is_anonymous === true;
    if (isAnonymous && location.pathname.startsWith("/pro")) {
      throw redirect({ to: "/auth", search: { next: location.pathname } });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const isPro = (roles ?? []).some((r) => r.role === "volunteer");
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
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
