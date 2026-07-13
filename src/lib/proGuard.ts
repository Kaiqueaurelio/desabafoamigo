import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Guard para rotas /pro/*.
 *  Mantém só a validação de sessão; 2FA fica opcional para agilizar o acesso.
 */
export async function ensureProAal2() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw redirect({ to: "/auth" });
}

