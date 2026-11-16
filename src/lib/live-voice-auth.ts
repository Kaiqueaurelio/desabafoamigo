type LiveVoiceTicketPayload = {
  sub: string;
  exp: number;
  nonce: string;
};

const TICKET_TTL_MS = 90_000;
const encoder = new TextEncoder();

function toBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret: string): Promise<CryptoKey> {
  const normalized = secret.trim();
  if (!normalized) throw new Error("Live voice signing is not configured");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(normalized),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Short-lived, voice-only authorization. It never contains a Supabase session token. */
export async function createLiveVoiceTicket(
  userId: string,
  secret: string,
  now = Date.now(),
): Promise<string> {
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(userId)) {
    throw new Error("Invalid live voice user");
  }
  const payload: LiveVoiceTicketPayload = {
    sub: userId,
    exp: now + TICKET_TTL_MS,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    encoder.encode(encodedPayload),
  );
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyLiveVoiceTicket(
  ticket: string,
  secret: string,
  now = Date.now(),
): Promise<string | null> {
  try {
    if (!ticket || ticket.length > 2048 || !secret.trim()) return null;
    const [encodedPayload, encodedSignature, extra] = ticket.split(".");
    if (!encodedPayload || !encodedSignature || extra) return null;
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      fromBase64Url(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as Partial<LiveVoiceTicketPayload>;
    if (
      typeof payload.sub !== "string" ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(payload.sub) ||
      typeof payload.exp !== "number" ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= now ||
      payload.exp > now + TICKET_TTL_MS + 1000
    ) {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}
