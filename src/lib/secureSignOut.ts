import { supabase } from "@/integrations/supabase/client";
import { clearStoredPasskeyToken } from "@/lib/passkeys";

/**
 * Logout robusto: encerra a sessão Supabase, limpa tokens de biometria
 * (passkey) de todos os escopos e apaga qualquer dado local sensível.
 *
 * Não interfere no fluxo 2FA — apenas encerra a sessão atual.
 * A persistência de sessão (permanecer logado) segue funcionando
 * normalmente no próximo login via localStorage do Supabase.
 */
export async function secureSignOut() {
  // Limpa tokens de passkey (bypass MFA) de todos os escopos ANTES do signOut
  // para evitar que uma nova sessão herde credenciais anteriores.
  try {
    clearStoredPasskeyToken("admin");
    clearStoredPasskeyToken("pro");
    clearStoredPasskeyToken("user");
  } catch {
    /* noop */
  }

  // signOut com escopo local revoga o refresh token no servidor e apaga
  // storage local. Se falhar (offline), força limpeza local mesmo assim.
  try {
    await supabase.auth.signOut();
  } catch {
    try {
      // fallback: remove qualquer chave sb-*-auth-token remanescente
      if (typeof window !== "undefined") {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))
          .forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      /* noop */
    }
  }
}
