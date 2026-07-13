/**
 * Cuidado com o voluntário: conta quantas conversas ele atendeu na sessão
 * atual e sugere pausa a cada 3 atendimentos consecutivos.
 * Persistência client-side (localStorage) — proposital: é um lembrete
 * pessoal, não uma métrica que precisa cruzar dispositivos.
 */
const KEY = "desabafo:pro:session";
const PAUSE_EVERY = 3;
const RESET_AFTER_MS = 30 * 60 * 1000; // 30 min sem atender zera o contador

type Session = { count: number; lastAt: number; dismissedAt: number };

function read(): Session {
  if (typeof window === "undefined") return { count: 0, lastAt: 0, dismissedAt: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { count: 0, lastAt: 0, dismissedAt: 0 };
    return JSON.parse(raw) as Session;
  } catch {
    return { count: 0, lastAt: 0, dismissedAt: 0 };
  }
}

function write(s: Session) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

/** Chame ao aceitar / iniciar um atendimento. Retorna true se é hora de sugerir pausa. */
export function registerConversationStart(): boolean {
  const now = Date.now();
  const s = read();
  const stale = now - s.lastAt > RESET_AFTER_MS;
  const next: Session = {
    count: stale ? 1 : s.count + 1,
    lastAt: now,
    dismissedAt: stale ? 0 : s.dismissedAt,
  };
  write(next);
  return next.count > 0 && next.count % PAUSE_EVERY === 0 && next.dismissedAt < next.lastAt - 60_000;
}

export function getSessionCount(): number {
  return read().count;
}

export function dismissPauseSuggestion() {
  const s = read();
  write({ ...s, dismissedAt: Date.now() });
}

export function resetSession() {
  write({ count: 0, lastAt: 0, dismissedAt: 0 });
}
