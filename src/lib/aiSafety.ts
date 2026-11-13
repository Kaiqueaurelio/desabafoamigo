// Regras de segurança do Desabafo Amigo AI (puras, testáveis).
import { detectRisk } from "./riskWords";

export type RiskLevel = "none" | "attention" | "urgent";
export type RiskAssessment = { level: RiskLevel; offerHuman: boolean; source: "ai" | "keywords" | "fallback" };

const IMMEDIATE_INTENT = [
  /\\b(quero morrer|quero me matar|nao quero (mais )?viver|vou me suicidar|pensando em agir hoje)\\b/i,
  /\b(vou|irei|pretendo|decidi|estou prestes a)\b.{0,55}\b(me matar|tirar minha vida|me suicidar|acabar com minha vida)\b/i,
  /\b(j[aá] comecei|j[aá] tomei|acabei de tomar|estou me ferindo|estou me machucando)\b/i,
  /\b(tenho um plano|planejei)\b.{0,55}\b(suic[ií]dio|me matar|tirar minha vida)\b/i,
];
const IDEATION = [
  /\b(quero morrer|queria morrer|quero me matar|pensando em me matar|penso em me matar|pensando em tirar minha vida|penso em tirar minha vida|tenho pensado em suicidio|nao quero (mais )?viver|queria nao acordar|ideia(s)? de suicidio)\b/i,
];

/** Avalia a conversa acumulada; não substitui avaliação humana nem diagnóstico clínico. */
export function assessRisk(text: string, aiSeverity: unknown): RiskAssessment {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const immediate = IMMEDIATE_INTENT.some((pattern) => pattern.test(normalized));
  const ideationMentions = normalized.split(/\n+/).filter((line) => !/\b(nao estou pensando em|nao pretendo|nao tenho intencao de)\b.{0,35}\b(me matar|tirar minha vida|suicidio)\b/i.test(line) && IDEATION.some((pattern) => pattern.test(line))).length;
  const repeatedIdeation = ideationMentions >= 2;
  const anyIdeation = ideationMentions >= 1;
  const kwAny = detectRisk(text);
  if (immediate || repeatedIdeation) return { level: "urgent", offerHuman: true, source: "keywords" };
  const sev = typeof aiSeverity === "number" && Number.isFinite(aiSeverity) ? aiSeverity : null;
  if (sev === null) return { level: anyIdeation || kwAny ? "attention" : "attention", offerHuman: true, source: "fallback" };
  if (sev >= 3 || repeatedIdeation) return { level: "urgent", offerHuman: true, source: repeatedIdeation ? "keywords" : "ai" };
  if (sev >= 2 || anyIdeation || kwAny) return { level: "attention", offerHuman: true, source: anyIdeation || kwAny ? "keywords" : "ai" };
  return { level: "none", offerHuman: false, source: "ai" };
}

/** Lê a resposta JSON do modelo de forma defensiva. */
export function parseAiJson(raw: string): { reply: string; severity: number; memorySummary: string | null } | null {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]) as { reply?: unknown; severity?: unknown; memorySummary?: unknown };
    const sev = Number(j.severity);
    if (typeof j.reply !== "string" || !j.reply.trim() || !Number.isFinite(sev)) return null;
    return { reply: j.reply.trim().slice(0, 2000), severity: Math.max(0, Math.min(3, Math.round(sev))), memorySummary: typeof j.memorySummary === "string" && j.memorySummary.trim() ? j.memorySummary.trim().slice(0, 1500) : null };
  } catch { return null; }
}

export const FALLBACK_REPLY =
  "Estou com dificuldade técnica para responder agora, mas você não está sozinho(a). Se quiser, posso te conectar a um voluntário humano. Em situação de risco, ligue 188 (CVV, gratuito, 24h) ou 192 (SAMU).";
