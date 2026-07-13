import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditItem = {
  id: string;
  action: string;
  created_at: string;
  role: "actor" | "target";
};

/**
 * Retorna eventos do audit_log em que o usuário aparece como ator OU alvo.
 * Usado no painel "Transparência" do usuário (LGPD art. 9º).
 */
export const getMyAuditTrail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const { data, error } = await supabaseAdmin
      .from("audit_log")
      .select("id, action, created_at, actor_id, target_id")
      .or(`actor_id.eq.${userId},target_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    return (data ?? []).map((r) => ({
      id: r.id,
      action: r.action,
      created_at: r.created_at,
      role: r.actor_id === userId ? "actor" : "target",
    }));
  });

