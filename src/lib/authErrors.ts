const NETWORK_FAILURE_PATTERN =
  /load failed|failed to fetch|fetch failed|networkerror|network request failed|internet connection.*offline|network is unreachable|err_network|connection timed out|timed out/i;

function readErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

/**
 * Safari/WebKit commonly reports failed browser requests as the generic
 * TypeError message "Load failed". Keep this classification narrow so that
 * invalid credentials and normal Auth API responses are never retried.
 */
export function isNetworkError(error: unknown): boolean {
  return NETWORK_FAILURE_PATTERN.test(readErrorMessage(error));
}

/**
 * Converts low-level Supabase/browser errors into safe, actionable copy.
 * Technical details from the server are intentionally not shown to end users.
 */
export function getAuthErrorMessage(error: unknown, isOnline?: boolean): string {
  if (isNetworkError(error)) {
    if (isOnline === false) {
      return "Seu dispositivo está sem conexão com a internet. Conecte-se e tente novamente.";
    }

    return "Não foi possível conectar ao serviço de login. Verifique sua conexão e tente novamente. Se a internet estiver funcionando, tente novamente em instantes.";
  }

  return "Não foi possível concluir seu acesso. Confira seus dados e tente novamente.";
}
