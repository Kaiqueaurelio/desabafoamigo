import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isPro = (roles ?? []).some((r) => r.role === "volunteer" || r.role === "psychologist");
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    return { user: data.user, isPro, isAdmin };
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
