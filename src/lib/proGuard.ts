import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard para rotas /pro/*.
 *  1. Precisa ser voluntário aprovado (context.isPro já checado pelo layout).
 *  2. Se ainda não tem fator TOTP verificado -> /pro/mfa (inscrição).
 *  3. Se tem fator verificado mas sessão está em AAL1 -> /pro/mfa (desafio).
 */
export async function ensureProAal2() {
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const verified = (factorsData?.totp ?? []).filter((f) => f.status === "verified");
  if (verified.length === 0) {
    throw redirect({ to: "/pro/mfa" });
  }
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    throw redirect({ to: "/pro/mfa" });
  }
}
