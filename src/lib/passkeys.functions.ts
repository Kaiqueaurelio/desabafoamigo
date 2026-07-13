import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Helpers to derive RP info from the current request (works in preview + prod)
function rpFromRequest() {
  const req = getRequest();
  const url = new URL(req.url);
  const rpID = url.hostname;
  const origin = `${url.protocol}//${url.host}`;
  return { rpID, origin, rpName: "Desabafa Amigo" };
}

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
  .handler(async ({ data, context }) => {
    const { generateRegistrationOptions } = await import("@simplewebauthn/server");
    const { supabase, userId, claims } = context;
    const scope = data.scope ?? "user";
    const { rpID, rpName } = rpFromRequest();

    const { data: existing } = await supabase
      .from("webauthn_credentials")
      .select("credential_id, transports")
      .eq("user_id", userId);

    const email = (claims?.email as string | undefined) ?? "user";
    const options = await generateRegistrationOptions({
      rpID,
      rpName,
      userID: new TextEncoder().encode(userId),
      userName: email,
      userDisplayName: email,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      excludeCredentials: (existing ?? []).map((c) => ({
        id: c.credential_id,
        transports: (c.transports as AuthenticatorTransport[] | null) ?? undefined,
      })),
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("webauthn_challenges").insert({
      user_id: userId,
      challenge: options.challenge,
      kind: "register",
      scope,
    });

    return { options, deviceName: data.deviceName ?? "Chave de acesso" };
  });

export const passkeyRegisterVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { response: unknown; scope?: string; deviceName?: string }) => d)
  .handler(async ({ data, context }) => {
    const { verifyRegistrationResponse } = await import("@simplewebauthn/server");
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID, origin } = rpFromRequest();

    // fetch latest register challenge
    const { data: chRows } = await supabaseAdmin
      .from("webauthn_challenges")
      .select("id, challenge, expires_at")
      .eq("user_id", userId)
      .eq("kind", "register")
      .order("created_at", { ascending: false })
      .limit(1);
    const ch = chRows?.[0];
    if (!ch) throw new Error("Desafio não encontrado. Recomece o cadastro.");
    if (new Date(ch.expires_at).getTime() < Date.now())
      throw new Error("Desafio expirado. Recomece.");

    const verification = await verifyRegistrationResponse({
      response: data.response as never,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Falha ao verificar a chave.");
    }
    const info = verification.registrationInfo;
    const credential = info.credential;

    await supabaseAdmin.from("webauthn_credentials").insert({
      user_id: userId,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter ?? 0,
      transports: credential.transports ?? [],
      device_name: (data.deviceName ?? "Chave de acesso").slice(0, 60),
      scope: data.scope ?? "user",
      backed_up: info.credentialBackedUp ?? false,
      device_type: info.credentialDeviceType ?? null,
    });

    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", ch.id);
    return { ok: true };
  });

// --------------------------------------------------------------- Authentication (login)

export const passkeyAuthOptions = createServerFn({ method: "POST" })
  .inputValidator((d: { email?: string; scope?: "admin" | "pro" | "user" }) => d)
  .handler(async ({ data }) => {
    const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID } = rpFromRequest();
    const scope = data.scope ?? "user";

    let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] = [];
    let targetUserId: string | null = null;

    if (data.email) {
      const email = data.email.trim().toLowerCase();
      // resolve user_id via admin api
      const { data: u } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = u?.users?.find((x) => (x.email ?? "").toLowerCase() === email);
      if (found) {
        targetUserId = found.id;
        const { data: creds } = await supabaseAdmin
          .from("webauthn_credentials")
          .select("credential_id, transports")
          .eq("user_id", found.id);
        allowCredentials = (creds ?? []).map((c) => ({
          id: c.credential_id,
          transports: (c.transports as AuthenticatorTransport[] | null) ?? undefined,
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: allowCredentials.length ? allowCredentials : undefined,
      userVerification: "preferred",
    });

    await supabaseAdmin.from("webauthn_challenges").insert({
      user_id: targetUserId,
      email: data.email?.trim().toLowerCase() ?? null,
      challenge: options.challenge,
      kind: "authenticate",
      scope,
    });

    return { options };
  });

export const passkeyAuthVerify = createServerFn({ method: "POST" })
  .inputValidator((d: { response: unknown; email?: string; scope?: string }) => d)
  .handler(async ({ data }) => {
    const { verifyAuthenticationResponse } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { rpID, origin } = rpFromRequest();

    const response = data.response as { id: string };
    const credentialId = response.id;

    const { data: credRow } = await supabaseAdmin
      .from("webauthn_credentials")
      .select("*")
      .eq("credential_id", credentialId)
      .maybeSingle();
    if (!credRow) throw new Error("Chave não reconhecida.");

    // find latest challenge for this user or email
    let chQ = supabaseAdmin
      .from("webauthn_challenges")
      .select("*")
      .eq("kind", "authenticate")
      .order("created_at", { ascending: false })
      .limit(1);
    if (data.email) chQ = chQ.eq("email", data.email.trim().toLowerCase());
    else chQ = chQ.eq("user_id", credRow.user_id);
    const { data: chRows } = await chQ;
    const ch = chRows?.[0];
    if (!ch) throw new Error("Desafio não encontrado.");

    const verification = await verifyAuthenticationResponse({
      response: data.response as never,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credRow.credential_id,
        publicKey: new Uint8Array(Buffer.from(credRow.public_key, "base64")),
        counter: Number(credRow.counter ?? 0),
        transports: (credRow.transports as AuthenticatorTransport[] | null) ?? undefined,
      },
      requireUserVerification: false,
    });
    if (!verification.verified) throw new Error("Falha ao validar a chave.");

    await supabaseAdmin
      .from("webauthn_credentials")
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", credRow.id);

    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", ch.id);

    // opportunistic cleanup
    await supabaseAdmin
      .from("webauthn_challenges")
      .delete()
      .lt("expires_at", new Date().toISOString());

    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 8; // 8h
    const token = await signToken({
      sub: credRow.user_id,
      scope: credRow.scope,
      cid: credRow.credential_id,
      exp,
    });
    return { token, userId: credRow.user_id, scope: credRow.scope, exp };
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
