// Regras de segurança do Desabafo Amigo AI (puras, testáveis).
import { detectRisk } from "./riskWords";

export type RiskLevel = "none" | "attention" | "urgent";
export type RiskAssessment = { level: RiskLevel; offerHuman: boolean; source: "ai" | "keywords" | "fallback" };

const URGENT = [/quero (me )?(matar|morrer)/i, /vou (me )?(matar|suicidar)/i, /n[ãa]o quero (mais )?viver/i, /acabar com (minha vida|tudo)/i, /me machucar/i, /suic[íi]d/i];

/** Combina palavras-chave locais com o resultado da IA. Se a IA falhar (null/inválido),
 *  NUNCA concluímos "sem risco": caímos para contingência e oferecemos humano. */
export function assessRisk(text: string, aiSeverity: unknown): RiskAssessment {
  const kwUrgent = URGENT.some((p) => p.test(text));
  const kwAny = detectRisk(text);
  if (kwUrgent) return { level: "urgent", offerHuman: true, source: "keywords" };
  const sev = typeof aiSeverity === "number" && Number.isFinite(aiSeverity) ? aiSeverity : null;
  if (sev === null) return { level: kwAny ? "urgent" : "attention", offerHuman: true, source: "fallback" };
  if (sev >= 3) return { level: "urgent", offerHuman: true, source: "ai" };
  if (sev >= 2 || kwAny) return { level: "attention", offerHuman: true, source: kwAny ? "keywords" : "ai" };
  return { level: "none", offerHuman: false, source: "ai" };
}

/** Lê a resposta JSON do modelo de forma defensiva. */
export function parseAiJson(raw: string): { reply: string; severity: number } | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]) as { reply?: unknown; severity?: unknown };
    const sev = Number(j.severity);
    if (typeof j.reply !== "string" || !j.reply.trim() || !Number.isFinite(sev)) return null;
    return { reply: j.reply.trim().slice(0, 2000), severity: Math.max(0, Math.min(3, Math.round(sev))) };
  } catch { return null; }
}

export const FALLBACK_REPLY =
  "Estou com dificuldade técnica para responder agora, mas você não está sozinho(a). Se quiser, posso te conectar a um voluntário humano. Em situação de risco, ligue 188 (CVV, gratuito, 24h) ou 192 (SAMU).";
