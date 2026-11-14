// Helpers de token de passkey — SEM imports de @simplewebauthn/browser
// (a lib do navegador puxa CommonJS/tslib e quebra SSR quando módulos
// alcançáveis pelo servidor a importam).
import { passkeyTokenValid } from "@/lib/passkeys.functions";

const TOKEN_KEY = (scope: string) => `passkey_token_${scope}`;

export function getStoredPasskeyToken(scope: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY(scope)) ?? sessionStorage.getItem(TOKEN_KEY(scope));
  } catch {
    return null;
  }
}

export function clearStoredPasskeyToken(scope: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY(scope));
    sessionStorage.removeItem(TOKEN_KEY(scope));
  } catch {
    /* noop */
  }
}

export function storePasskeyToken(scope: string, token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY(scope), token);
  } catch {
    /* noop */
  }
}

/** Check if a stored token is still valid server-side (also confirms user match). */
export async function hasValidPasskeyToken(scope: "admin" | "pro" | "user"): Promise<boolean> {
  const token = getStoredPasskeyToken(scope);
  if (!token) return false;
  try {
    const { valid } = await passkeyTokenValid({ data: { token, scope } });
    if (!valid) clearStoredPasskeyToken(scope);
    return valid;
  } catch {
    return false;
  }
}
