import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { hasValidPasskeyToken } from "@/lib/passkeys";

/**
 * Guard para rotas /pro/*.
 *  1. Precisa ser voluntário aprovado (context.isPro já checado pelo layout).
 *  2. Passkey (chave de acesso) válida -> ok, pula TOTP.
 *  3. Se ainda não tem fator TOTP verificado -> /pro/mfa (inscrição).
 *  4. Se tem fator verificado mas sessão está em AAL1 -> /pro/mfa (desafio).
 */
export async function ensureProAal2() {
  if (await hasValidPasskeyToken("pro")) return;
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

