// Sistema de badges de voluntários — derivado das métricas de atendimento
export type Badge = {
  key: string;
  label: string;
  emoji: string;
  description: string;
};

export function badgesFor(stats: { completed: number; avgRating: number | null }): Badge[] {
  const out: Badge[] = [];
  const c = stats.completed;
  if (c >= 1) out.push({ key: "first", label: "Primeira escuta", emoji: "🌱", description: "Concluiu a primeira conversa." });
  if (c >= 10) out.push({ key: "ten", label: "10 escutas", emoji: "🌿", description: "10 conversas concluídas." });
  if (c >= 50) out.push({ key: "fifty", label: "50 escutas", emoji: "🌳", description: "50 conversas concluídas." });
  if (c >= 100) out.push({ key: "hundred", label: "100 escutas", emoji: "🏅", description: "100 conversas concluídas." });
  if (stats.avgRating !== null && stats.avgRating >= 4.5 && c >= 5) {
    out.push({ key: "kind", label: "Escuta amável", emoji: "💛", description: "Avaliação média ≥ 4,5 em 5+ conversas." });
  }
  return out;
}

export function badgeLevel(completed: number): { label: string; next: number | null } {
  if (completed >= 100) return { label: "Guardião", next: null };
  if (completed >= 50) return { label: "Referência", next: 100 };
  if (completed >= 10) return { label: "Presente", next: 50 };
  if (completed >= 1) return { label: "Iniciante", next: 10 };
  return { label: "Voluntário(a)", next: 1 };
}
