import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ------- Sign a short-lived token so the client can present passkey-verification to guards
async function signToken(payload: Record<string, unknown>): Promise<string> {
  const secret = process.env.PASSKEY_TOKEN_SECRET!;
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, "");
  return `${body}.${sigB64}`;
}

async function verifyToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig) return null;
    const secret = process.env.PASSKEY_TOKEN_SECRET!;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(body),
    );
    if (!ok) return null;
    const payload = JSON.parse(atob(body));
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------- Registration

export const passkeyRegisterOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { scope?: "admin" | "pro" | "user"; deviceName?: string }) => d)
  .handler(async () => {
    throw new Error("Chaves de acesso estão temporariamente indisponíveis. Use senha + código de 6 dígitos.");
  });

export const passkeyRegisterVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { response: unknown; scope?: string; deviceName?: string }) => d)
  .handler(async () => {
    throw new Error("Chaves de acesso estão temporariamente indisponíveis. Use senha + código de 6 dígitos.");
  });

// --------------------------------------------------------------- Authentication (login)

export const passkeyAuthOptions = createServerFn({ method: "POST" })
  .inputValidator((d: { email?: string; scope?: "admin" | "pro" | "user" }) => d)
  .handler(async () => {
    throw new Error("Chaves de acesso estão temporariamente indisponíveis. Use senha + código de 6 dígitos.");
  });

export const passkeyAuthVerify = createServerFn({ method: "POST" })
  .inputValidator((d: { response: unknown; email?: string; scope?: string }) => d)
  .handler(async () => {
    throw new Error("Chaves de acesso estão temporariamente indisponíveis. Use senha + código de 6 dígitos.");
  });

// -------------------------------------------------- Server-side guard for the token
export const passkeyTokenValid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string; scope?: string }) => d)
  .handler(async ({ data, context }) => {
    const payload = await verifyToken(data.token);
    if (!payload) return { valid: false as const };
    if (payload.sub !== context.userId) return { valid: false as const };
    if (data.scope && payload.scope !== data.scope) return { valid: false as const };
    return { valid: true as const, exp: Number(payload.exp ?? 0) };
  });

// ---------------------------------------------------------------------- Management

export const listMyPasskeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("webauthn_credentials")
      .select("id, device_name, scope, created_at, last_used_at, device_type, backed_up")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { credentials: data ?? [] };
  });

export const deleteMyPasskey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("webauthn_credentials").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });
