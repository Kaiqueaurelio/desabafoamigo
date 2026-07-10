import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard usado por todas as rotas /admin/*.
 * Regras:
 *  1. Precisa estar autenticado e ter papel "admin".
 *  2. Se ainda não tem um fator TOTP verificado -> /admin/mfa (para inscrever).
 *  3. Se tem fator verificado mas a sessão está em AAL1 -> /admin/login (para desafiar).
 */
export async function ensureAdminAal2(opts: { allowMfaEnroll?: boolean } = {}) {
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

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const verifiedTotp = (factorsData?.totp ?? []).filter((f) => f.status === "verified");

  if (verifiedTotp.length === 0) {
    if (opts.allowMfaEnroll) return { user: userRes.user, needsEnroll: true };
    throw redirect({ to: "/admin/mfa" });
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    throw redirect({ to: "/admin/login" });
  }

  return { user: userRes.user, needsEnroll: false };
}
