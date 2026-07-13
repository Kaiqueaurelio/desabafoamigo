import {
  clearStoredPasskeyToken,
  getStoredPasskeyToken,
  hasValidPasskeyToken,
} from "@/lib/passkeyToken";

export { clearStoredPasskeyToken, getStoredPasskeyToken, hasValidPasskeyToken };

export function isPasskeySupported(): boolean {
  return false;
}


export async function registerPasskey(opts: {
  scope: "admin" | "pro" | "user";
  deviceName?: string;
}) {
  void opts;
  throw new Error("Chaves de acesso estão temporariamente indisponíveis. Use senha + código de 6 dígitos.");
}

/** Full passkey login: requires signed-in Supabase session + returns short-lived MFA-skip token. */
export async function loginWithPasskey(opts: {
  email?: string;
  scope: "admin" | "pro" | "user";
}) {
  void opts;
  throw new Error("Chaves de acesso estão temporariamente indisponíveis. Use senha + código de 6 dígitos.");
}
