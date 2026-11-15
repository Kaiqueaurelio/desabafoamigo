import { withPendingDatabaseTypes } from "./pending-database-types";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const enqueueMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      topic: string;
      urgency?: "low" | "medium" | "high";
      preferredLang?: string;
      aiResponseEventId?: string;
    }) => {
      if (
        d.aiResponseEventId !== undefined &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          d.aiResponseEventId,
        )
      ) {
        throw new Error("Registro de resposta inválido.");
      }
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const urgency = data.urgency === "high" || data.urgency === "medium" ? data.urgency : "low";
    const preferredLang = (data.preferredLang ?? "pt-BR").slice(0, 10);
    // cancel any old waiting entries from me
    await supabase
      .from("queue")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .eq("status", "waiting");
    const { data: row, error } = await supabase
      .from("queue")
      .insert({
        user_id: userId,
        topic: data.topic.slice(0, 500),
        status: "waiting",
        urgency,
        preferred_lang: preferredLang,
      })
      .select("id")
      .single();
    if (error) throw error;

    // Registra somente que houve solicitação de acolhimento humano; nunca grava o texto da conversa.
    if (data.aiResponseEventId) {
      const { error: handoffError } = await withPendingDatabaseTypes(supabase)
        .from("ai_response_events")
        .update({
          forwarded_to_volunteer: true,
          forwarded_at: new Date().toISOString(),
        })
        .eq("id", data.aiResponseEventId)
        .eq("user_id", userId);
      if (handoffError) {
        console.warn("[queue] AI handoff telemetry update failed", handoffError.message);
      }
    }

    // Notifica voluntários aprovados sobre nova pessoa na fila (best-effort, não bloqueia)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendPushToRole } = await import("@/lib/push.server");
      const urgencyLabel =
        urgency === "high"
          ? "🔴 Urgência alta"
          : urgency === "medium"
            ? "🟡 Urgência média"
            : "🟢 Fila aberta";
      await sendPushToRole(supabaseAdmin, "volunteer", {
        title: "Alguém precisa de escuta 💙",
        body: `${urgencyLabel} — nova pessoa aguardando na fila.`,
        url: "/pro/fila",
        tag: "queue-new",
        icon: "/icon-192.png",
      });
    } catch (e) {
      console.warn("[push] queue notify failed", e);
    }

    return { queueId: row.id };
  });

export const cancelMyQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { queueId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("queue")
      .update({ status: "cancelled" })
      .eq("id", data.queueId)
      .eq("user_id", userId);
    return { ok: true };
  });

// Volunteer picks up next person or a specific queue entry
export const matchQueueEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { queueId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Atomic claim + appointment + conversation creation. The database function
    // verifies the volunteer role and locks the waiting queue row in one transaction.
    const { data: matches, error: matchError } = await withPendingDatabaseTypes(supabase).rpc(
      "claim_queue_entry",
      {
        _queue_id: data.queueId,
      },
    );
    if (matchError) {
      console.warn("[queue] atomic match failed", matchError.message);
      throw new Error(matchError.message || "Não foi possível assumir esta conversa.");
    }
    const match = matches?.[0];
    if (!match?.appointment_id || !match.conversation_id) {
      throw new Error("A fila não retornou uma conversa válida. Atualize e tente novamente.");
    }
    const appointmentId = match.appointment_id;
    const conversationId = match.conversation_id;

    // Notifica o solicitante que um voluntário aceitou (match) — best-effort
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendPushToUser } = await import("@/lib/push.server");
      await sendPushToUser(supabaseAdmin, match.user_id, {
        title: "Você tem um match! 💬",
        body: "Um(a) voluntário(a) está pronto(a) para conversar com você.",
        url: `/consulta/${appointmentId}`,
        tag: "match-ready",
        requireInteraction: true,
        icon: "/icon-192.png",
      });
    } catch (e) {
      console.warn("[push] match notify failed", e);
    }

    return { appointmentId, conversationId };
  });
