import { supabase } from "@/integrations/supabase/client";

/**
 * Garante que o visitante tenha uma sessão anônima válida.
 * Não pede nome, e-mail ou telefone. A sessão existe apenas para
 * permitir RLS no chat; nenhum dado pessoal é coletado.
 */
export async function ensureAnonymousSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: signIn, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return signIn.session;
}
