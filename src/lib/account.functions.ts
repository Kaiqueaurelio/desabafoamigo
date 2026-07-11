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

/**
 * Exporta os dados do usuário autenticado (LGPD art. 18 — portabilidade).
 * Retorna um snapshot JSON com perfil, humor, diário, avaliações e
 * conversas em que participou (apenas mensagens que ele próprio enviou).
 */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profile, moods, appts, myMsgs, ratings] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("mood_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("appointments").select("id, scheduled_at, topic, status, created_at")
        .or(`patient_id.eq.${userId},professional_id.eq.${userId}`),
      supabase.from("messages").select("id, conversation_id, content, transcription, created_at")
        .eq("sender_id", userId).order("created_at", { ascending: false }).limit(2000),
      supabase.from("appointments").select("id, patient_rating, patient_feedback").eq("patient_id", userId),
    ]);

    await supabase.rpc("log_audit", {
      _action: "account.export",
      _target_type: "user",
      _target_id: userId,
      _metadata: {},
    });

    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data ?? null,
      mood_entries: moods.data ?? [],
      appointments: appts.data ?? [],
      messages_sent: myMsgs.data ?? [],
      ratings: ratings.data ?? [],
    };
  });
