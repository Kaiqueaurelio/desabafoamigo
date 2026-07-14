import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard para rotas /pro/*.
 * Exige sessão autenticada + papel "volunteer" (aprovado) ou "admin".
 * Usuários comuns sem patente são redirecionados para /inicio.
 */
export async function ensureProAal2() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw redirect({ to: "/auth" });

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);
  const allowed = (roles ?? []).some((r) => r.role === "volunteer" || r.role === "admin");
  if (!allowed) throw redirect({ to: "/inicio" });
}
