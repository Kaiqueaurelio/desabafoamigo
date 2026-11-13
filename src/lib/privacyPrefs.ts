export type PrivacyPrefs = { aiConsent: boolean; keepAiHistory: boolean; rememberAiContext: boolean; retentionDays: 0 | 7 | 30 };
const KEY = "da_privacy_prefs";
export const DEFAULT_PREFS: PrivacyPrefs = { aiConsent: false, keepAiHistory: false, rememberAiContext: false, retentionDays: 0 };
export function loadPrefs(): PrivacyPrefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULT_PREFS; }
}
export function savePrefs(p: PrivacyPrefs) { localStorage.setItem(KEY, JSON.stringify(p)); }
export const AI_HISTORY_KEY = "da_ai_history";
export function clearAiHistory() { localStorage.removeItem(AI_HISTORY_KEY); }
