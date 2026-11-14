// Regras de segurança do Desabafo Amigo AI (puras, testáveis).
import { detectRisk } from "./riskWords";

export type RiskLevel = "none" | "attention" | "urgent";
export type RiskAssessment = {
  level: RiskLevel;
  offerHuman: boolean;
  source: "ai" | "keywords" | "fallback";
};

const IMMEDIATE_INTENT = [
  /\b(quero morrer|quero me matar|nao quero (mais )?viver|vou me suicidar|pensando em agir hoje)\b/i,
  /\b(vou|irei|pretendo|decidi|estou prestes a)\b.{0,55}\b(me matar|tirar minha vida|me suicidar|acabar com minha vida)\b/i,
  /\b(j[aá] comecei|j[aá] tomei|acabei de tomar|estou me ferindo|estou me machucando)\b/i,
  /\b(tenho um plano|planejei)\b.{0,55}\b(suic[ií]dio|me matar|tirar minha vida)\b/i,
];
const IDEATION = [
  /\b(quero morrer|queria morrer|quero me matar|pensando em me matar|penso em me matar|pensei em suicidio|pensando em tirar minha vida|penso em tirar minha vida|tenho pensado em suicidio|nao quero (mais )?viver|queria nao acordar|ideia(s)? de suicidio)\b/i,
];

/** Avalia a conversa acumulada; não substitui avaliação humana nem diagnóstico clínico. */
export function assessRisk(text: string, aiSeverity: unknown): RiskAssessment {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Evaluate each clause independently. A denial before "mas/porém" must
  // never suppress a later positive statement of intent in the same message.
  const clauses = normalized
    .split(/[\n,;.!?]+|\b(?:e|mas|por[eé]m|contudo|todavia|no entanto|s[oó] que)\b/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const denial =
    /\b(nao estou pensando em|nao pretendo|nao tenho intencao de|nao quero morrer|nao quero me matar|nao tenho plano de|nao penso em me matar|nao penso em suicidio)\b/i;
  const positiveClauses = clauses.filter((clause) => !denial.test(clause));
  const immediate = positiveClauses.some((clause) =>
    IMMEDIATE_INTENT.some((pattern) => pattern.test(clause)),
  );
  const ideationMentions = positiveClauses.filter((clause) =>
    IDEATION.some((pattern) => pattern.test(clause)),
  ).length;
  const repeatedIdeation = ideationMentions >= 2;
  const anyIdeation = ideationMentions >= 1;
  const kwAny = positiveClauses.length > 0 && detectRisk(positiveClauses.join("\n"));

  if (immediate || repeatedIdeation) {
    return { level: "urgent", offerHuman: true, source: "keywords" };
  }
  const sev = typeof aiSeverity === "number" && Number.isFinite(aiSeverity) ? aiSeverity : null;
  if (sev === null) {
    return { level: "attention", offerHuman: true, source: "fallback" };
  }
  if (sev >= 3 || repeatedIdeation) {
    return {
      level: "urgent",
      offerHuman: true,
      source: repeatedIdeation ? "keywords" : "ai",
    };
  }
  if (sev >= 2 || anyIdeation || kwAny) {
    return {
      level: "attention",
      offerHuman: true,
      source: anyIdeation || kwAny ? "keywords" : "ai",
    };
  }
  return { level: "none", offerHuman: false, source: "ai" };
}

/** Lê a resposta JSON do modelo de forma defensiva. */
export function parseAiJson(
  raw: string,
): { reply: string; severity: number | null; memorySummary: string | null } | null {
  if (!raw.trim()) return null;

  // Models may prepend a short reasoning/preamble or wrap JSON in Markdown.
  // Scan balanced JSON objects rather than using a greedy regex, which can
  // accidentally merge multiple objects and reject an otherwise valid reply.
  const candidates: string[] = [];
  for (let start = 0; start < raw.length; start += 1) {
    if (raw[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let end = start; end < raw.length; end += 1) {
      const char = raw[end];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          candidates.push(raw.slice(start, end + 1));
          start = end;
          break;
        }
      }
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        reply?: unknown;
        severity?: unknown;
        memorySummary?: unknown;
      };
      const severity =
        parsed.severity === undefined || parsed.severity === null
          ? null
          : Number(parsed.severity);
      if (
        typeof parsed.reply !== "string" ||
        !parsed.reply.trim() ||
        (severity !== null && !Number.isFinite(severity))
      ) {
        continue;
      }
      return {
        reply: parsed.reply.trim().slice(0, 2000),
        severity:
          severity === null ? null : Math.max(0, Math.min(3, Math.round(severity))),
        memorySummary:
          typeof parsed.memorySummary === "string" && parsed.memorySummary.trim()
            ? parsed.memorySummary.trim().slice(0, 1500)
            : null,
      };
    } catch {
      // Ignore malformed candidates and keep looking for a valid response.
    }
  }
  return null;
}

export const FALLBACK_REPLY =
  "Estou com dificuldade técnica para responder agora, mas você não está sozinho(a). Se quiser, posso te conectar a um voluntário humano. Em situação de risco, ligue 188 (CVV, gratuito, 24h) ou 192 (SAMU).";
