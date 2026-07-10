// Detecção simples de sinais de risco em mensagens.
// Retorna true se a mensagem contém expressões associadas a crise.
const PATTERNS = [
  /n[ãa]o quero (mais )?viver/i,
  /quero (me )?(matar|morrer)/i,
  /vou (me )?(matar|suicidar)/i,
  /pensei em (me )?matar/i,
  /acabar com (tudo|minha vida)/i,
  /suic[íi]dio/i,
  /me machucar/i,
  /sem sa[íi]da/i,
  /desist[ií]/i,
];

export function detectRisk(text: string): boolean {
  if (!text) return false;
  return PATTERNS.some((p) => p.test(text));
}
