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
  const { startRegistration } = await import("@simplewebauthn/browser");
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
  const { startAuthentication } = await import("@simplewebauthn/browser");
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
