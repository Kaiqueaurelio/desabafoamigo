import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const enqueueMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { topic: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // cancel any old waiting entries from me
    await supabase.from("queue").update({ status: "cancelled" })
      .eq("user_id", userId).eq("status", "waiting");
    const { data: row, error } = await supabase.from("queue")
      .insert({ user_id: userId, topic: data.topic.slice(0, 500), status: "waiting" })
      .select("id").single();
    if (error) throw error;
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

    return { appointmentId: appt.id, conversationId: conv.id };
  });
