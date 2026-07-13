import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import {
  passkeyAuthOptions,
  passkeyAuthVerify,
  passkeyRegisterOptions,
  passkeyRegisterVerify,
} from "@/lib/passkeys.functions";
import {
  clearStoredPasskeyToken,
  getStoredPasskeyToken,
  hasValidPasskeyToken,
  storePasskeyToken,
} from "@/lib/passkeyToken";

export { clearStoredPasskeyToken, getStoredPasskeyToken, hasValidPasskeyToken };

export function isPasskeySupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials !== "undefined"
  );
}


export async function registerPasskey(opts: {
  scope: "admin" | "pro" | "user";
  deviceName?: string;
}) {
  const { options, deviceName } = await passkeyRegisterOptions({
    data: { scope: opts.scope, deviceName: opts.deviceName },
  });
  const response = await startRegistration({ optionsJSON: options as never });
  await passkeyRegisterVerify({
    data: { response, scope: opts.scope, deviceName: opts.deviceName ?? deviceName },
  });
}

/** Full passkey login: requires signed-in Supabase session + returns short-lived MFA-skip token. */
export async function loginWithPasskey(opts: {
  email?: string;
  scope: "admin" | "pro" | "user";
}) {
  const { options } = await passkeyAuthOptions({
    data: { email: opts.email, scope: opts.scope },
  });
  const response = await startAuthentication({ optionsJSON: options as never });
  const { token, userId, exp } = await passkeyAuthVerify({
    data: { response, email: opts.email, scope: opts.scope },
  });
  storePasskeyToken(opts.scope, token);
  return { token, userId, exp };
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
