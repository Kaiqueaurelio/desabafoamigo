import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const enqueueMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic: string; urgency?: "low" | "medium" | "high"; preferredLang?: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const urgency = data.urgency === "high" || data.urgency === "medium" ? data.urgency : "low";
    const preferredLang = (data.preferredLang ?? "pt-BR").slice(0, 10);
    // cancel any old waiting entries from me
    await supabase.from("queue").update({ status: "cancelled" })
      .eq("user_id", userId).eq("status", "waiting");
    const { data: row, error } = await supabase.from("queue")
      .insert({ user_id: userId, topic: data.topic.slice(0, 500), status: "waiting", urgency, preferred_lang: preferredLang })
      .select("id").single();
    if (error) throw error;

    // Notifica voluntários aprovados sobre nova pessoa na fila (best-effort, não bloqueia)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendPushToRole } = await import("@/lib/push.server");
      const urgencyLabel = urgency === "high" ? "🔴 Urgência alta" : urgency === "medium" ? "🟡 Urgência média" : "🟢 Fila aberta";
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
  .inputValidator((d: { queueId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("queue").update({ status: "cancelled" })
      .eq("id", data.queueId).eq("user_id", userId);
    return { ok: true };
  });

// Volunteer picks up next person or a specific queue entry
export const matchQueueEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { queueId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // authorize: must be volunteer or admin
    const { data: isVol } = await supabase.rpc("has_role", { _user_id: userId, _role: "volunteer" });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isVol && !isAdmin) throw new Error("Somente voluntários");

    const { data: q } = await supabase.from("queue")
      .select("id, user_id, status, topic").eq("id", data.queueId).maybeSingle();
    if (!q || q.status !== "waiting") throw new Error("Entrada indisponível");

    // create appointment + conversation
    const { data: appt, error: aErr } = await supabase.from("appointments").insert({
      patient_id: q.user_id,
      professional_id: userId,
      scheduled_at: new Date().toISOString(),
      topic: q.topic || "Conversa rápida",
      status: "in_progress",
    }).select("id").single();
    if (aErr) throw aErr;

    const { data: conv, error: cErr } = await supabase.from("conversations").insert({
      user_id: q.user_id, volunteer_id: userId, appointment_id: appt.id, status: "active",
    }).select("id").single();
    if (cErr) throw cErr;

    await supabase.from("appointments").update({ conversation_id: conv.id }).eq("id", appt.id);
    await supabase.from("queue").update({
      status: "matched", matched_volunteer_id: userId, conversation_id: conv.id,
    }).eq("id", q.id);

    // Notifica o solicitante que um voluntário aceitou (match) — best-effort
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendPushToUser } = await import("@/lib/push.server");
      await sendPushToUser(supabaseAdmin, q.user_id, {
        title: "Você tem um match! 💬",
        body: "Um(a) voluntário(a) está pronto(a) para conversar com você.",
        url: `/consulta/${appt.id}`,
        tag: "match-ready",
        requireInteraction: true,
        icon: "/icon-192.png",
      });
    } catch (e) {
      console.warn("[push] match notify failed", e);
    }

    return { appointmentId: appt.id, conversationId: conv.id };
  });
