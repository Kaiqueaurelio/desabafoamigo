import { supabase } from "@/integrations/supabase/client";

export type MfaScope = "pro" | "admin";

export interface MfaLockStatus {
  locked: boolean;
  remainingSeconds: number;
  failedCount: number;
}

/**
 * Checa se a conta atual está bloqueada para tentativas TOTP no escopo.
 * Regra: 5 tentativas inválidas em 15 min -> bloqueio de 15 min.
 */
export async function checkMfaLock(scope: MfaScope): Promise<MfaLockStatus> {
  const { data, error } = await supabase.rpc("check_mfa_lock", { _scope: scope });
  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return { locked: false, remainingSeconds: 0, failedCount: 0 };
  }
  const row = data[0] as { locked: boolean; remaining_seconds: number; failed_count: number };
  return {
    locked: !!row.locked,
    remainingSeconds: row.remaining_seconds ?? 0,
    failedCount: row.failed_count ?? 0,
  };
}

export async function recordMfaAttempt(scope: MfaScope, success: boolean): Promise<void> {
  await supabase.rpc("record_mfa_attempt", { _scope: scope, _success: success });
}

export function formatLockMessage(remainingSeconds: number): string {
  const mins = Math.ceil(remainingSeconds / 60);
  return `Muitas tentativas inválidas. Tente novamente em ${mins} min.`;
}
