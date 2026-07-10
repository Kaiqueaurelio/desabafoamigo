import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Apaga a conta do usuário autenticado e todos os dados relacionados.
 * Registra a ação no audit_log antes de remover para manter rastro.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.rpc("log_audit", {
      _action: "account.delete",
      _target_type: "user",
      _target_id: userId,
      _metadata: {},
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
