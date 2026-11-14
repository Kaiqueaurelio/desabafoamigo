import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- TRAINING ----------

const submitQuizSchema = z.object({
  moduleId: z.string().uuid(),
  answers: z.array(z.number().int().min(0)).min(1).max(20),
});

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => submitQuizSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: mod, error: modErr } = await supabase
      .from("volunteer_training_modules")
      .select("id, quiz, min_score")
      .eq("id", data.moduleId)
      .eq("active", true)
      .maybeSingle();

    if (modErr) throw new Error(modErr.message);
    if (!mod) throw new Error("Módulo não encontrado.");

    const quiz = (mod.quiz ?? []) as { answer: number }[];
    if (!Array.isArray(quiz) || quiz.length === 0) {
      throw new Error("Módulo sem quiz configurado.");
    }
    if (data.answers.length !== quiz.length) {
      throw new Error("Número de respostas não bate com o quiz.");
    }

    let correct = 0;
    quiz.forEach((q, i) => {
      if (q.answer === data.answers[i]) correct++;
    });
    const score = Math.round((correct / quiz.length) * 100);
    const passed = score >= (mod.min_score ?? 80);

    const { data: existing } = await supabase
      .from("volunteer_training_progress")
      .select("id, attempts")
      .eq("user_id", userId)
      .eq("module_id", data.moduleId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      module_id: data.moduleId,
      quiz_score: score,
      passed,
      attempts: (existing?.attempts ?? 0) + 1,
      completed_at: passed ? new Date().toISOString() : null,
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("volunteer_training_progress")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("volunteer_training_progress").insert(payload);
      if (error) throw new Error(error.message);
    }

    return { score, passed, minScore: mod.min_score ?? 80 };
  });

// ---------- FOLLOW-UP ----------

const replyFollowUpSchema = z.object({
  followUpId: z.string().uuid(),
  status: z.enum(["replied", "skipped"]),
  note: z.string().trim().max(500).optional(),
});

export const respondFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => replyFollowUpSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("conversation_follow_ups")
      .update({
        reply_status: data.status,
        reply_note: data.note ?? null,
      })
      .eq("id", data.followUpId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- CONVERSATION ACCESS LOG ----------

const accessLogSchema = z.object({
  conversationId: z.string().uuid(),
});

export const logConversationAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => accessLogSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("log_conversation_access", {
      _conversation_id: data.conversationId,
    });
    if (error) {
      // Não falhamos a operação do usuário por causa de auditoria
      console.warn("log_conversation_access failed:", error.message);
    }
    return { ok: true };
  });
