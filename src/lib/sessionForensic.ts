/**
 * Marca d'água forense por sessão.
 * Gera um hash curto (8 chars) determinístico a partir de userId + horário
 * da sessão + user-agent. Serve para rastrear precisamente qual sessão
 * originou um vazamento sem revelar dados sensíveis.
 */
const SESSION_KEY = "da:sess:forensic";

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function getSessionForensicHash(userId: string): string {
  if (typeof window === "undefined") return "server0000";
  try {
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) return cached;
  } catch { /* ignore */ }
  const seed = `${userId}|${Date.now()}|${navigator.userAgent}|${Math.random()}`;
  const hash = fnv1a(seed).slice(0, 8).toUpperCase();
  try { sessionStorage.setItem(SESSION_KEY, hash); } catch { /* ignore */ }
  return hash;
}
