/**
 * Preferências de acessibilidade persistidas em localStorage.
 * As classes correspondentes vivem em src/styles.css.
 */
export type A11yPrefs = {
  highContrast: boolean;
  dyslexia: boolean;
  largeText: boolean;
  reduceMotion: boolean;
};

const KEY = "desabafo:a11y";
const DEFAULTS: A11yPrefs = {
  highContrast: false,
  dyslexia: false,
  largeText: false,
  reduceMotion: false,
};

export function loadA11yPrefs(): A11yPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<A11yPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

export function saveA11yPrefs(prefs: A11yPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(prefs));
  applyA11yPrefs(prefs);
}

export function applyA11yPrefs(prefs: A11yPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("a11y-hc", prefs.highContrast);
  root.classList.toggle("a11y-dyslexia", prefs.dyslexia);
  root.classList.toggle("a11y-large", prefs.largeText);
  root.classList.toggle("a11y-reduce-motion", prefs.reduceMotion);
}
