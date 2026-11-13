import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const clearMyAiMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("ai_user_memory").delete().eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível apagar a memória de contexto.");
    return { ok: true };
  });
