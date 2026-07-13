import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard usado por todas as rotas /admin/*.
 * Regras:
 *  1. Precisa estar autenticado.
 *  2. Precisa ter papel "admin".
 *
 * O 2FA deixa de ser obrigatório para não atrasar o acesso diário.
 * A rota /admin/mfa continua disponível como opção de segurança manual.
 */
export async function ensureAdminAal2(opts: { allowMfaEnroll?: boolean } = {}) {
  void opts;
  const { data: userRes, error } = await supabase.auth.getUser();
  if (error || !userRes.user || userRes.user.is_anonymous) {
    throw redirect({ to: "/admin/login" });
  }
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userRes.user.id)
    .eq("role", "admin");
  if (!roles || roles.length === 0) {
    throw redirect({ to: "/admin/login" });
  }

  return { user: userRes.user, needsEnroll: false };
}

