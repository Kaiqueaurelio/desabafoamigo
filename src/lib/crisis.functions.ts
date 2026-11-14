import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

type CrisisRole = "admin" | "volunteer";
type CrisisSupabase = SupabaseClient<Database>;

const raiseEscalationSchema = z.object({
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  severity: z.enum(["high", "critical"]).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const emergencyActionSchema = z.object({
  kind: z.enum(["called_cvv", "called_samu", "shared_location_contact", "opened_safety_plan"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const safetyPlanSchema = z.object({
  emergency_contact_name: z.string().max(120).nullable().optional(),
  emergency_contact_phone: z
    .string()
    .max(30)
    .regex(/^[+\d()\s-]*$/, "Telefone inválido")
    .nullable()
    .optional(),
  reasons_to_live: z.string().max(2000).nullable().optional(),
  warning_signs: z.string().max(2000).nullable().optional(),
  coping_strategies: z.string().max(2000).nullable().optional(),
  share_location_with_contact: z.boolean().optional(),
});

async function hasCrisisRole(
  supabase: CrisisSupabase,
  userId: string,
  role: CrisisRole,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: role,
  });
  if (error) throw new Error("Não foi possível validar a permissão.");
  return data === true;
}

async function assertAdmin(supabase: CrisisSupabase, userId: string) {
  if (!(await hasCrisisRole(supabase, userId, "admin"))) {
    throw new Error("Acesso permitido somente a administradores.");
  }
}

async function assertVolunteerOrAdmin(supabase: CrisisSupabase, userId: string) {
  const [isAdmin, isVolunteer] = await Promise.all([
    hasCrisisRole(supabase, userId, "admin"),
    hasCrisisRole(supabase, userId, "volunteer"),
  ]);
  if (!isAdmin && !isVolunteer) {
    throw new Error("Somente voluntários e administradores podem sinalizar uma crise.");
  }
  return { isAdmin };
}

// Voluntário/admin marca uma conversa como risco alto para plantão.
export const raiseEscalation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => raiseEscalationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isAdmin } = await assertVolunteerOrAdmin(supabase, userId);

    // Never trust a user_id supplied by the browser: bind the escalation to
    // the actual participant recorded on the selected conversation.
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("user_id, volunteer_id")
      .eq("id", data.conversationId)
      .maybeSingle();

    if (conversationError || !conversation) {
      throw new Error("Conversa não encontrada ou sem permissão de acesso.");
    }
    if (conversation.user_id !== data.userId) {
      throw new Error("A pessoa informada não corresponde à conversa selecionada.");
    }
    if (!isAdmin && conversation.volunteer_id !== userId) {
      throw new Error("Você só pode sinalizar crises das conversas que atende.");
    }

    const { data: row, error } = await supabase
      .from("crisis_escalations")
      .insert({
        conversation_id: data.conversationId,
        user_id: conversation.user_id,
        raised_by: userId,
        severity: data.severity ?? "high",
        notes: data.notes ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await supabase.rpc("log_audit", {
      _action: "crisis.raise",
      _target_type: "conversation",
      _target_id: data.conversationId,
      _metadata: { severity: data.severity ?? "high" },
    });

    return row;
  });

export const listOpenEscalations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data, error } = await supabase
      .from("crisis_escalations")
      .select(
        "id, conversation_id, user_id, raised_by, severity, notes, status, created_at, acknowledged_at, resolved_at",
      )
      .in("status", ["open", "ack"])
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return data;
  });

export const ackEscalation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { error } = await supabase
      .from("crisis_escalations")
      .update({
        status: "ack",
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resolveEscalation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        notes: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { error } = await supabase
      .from("crisis_escalations")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        notes: data.notes ?? null,
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Registra que o próprio usuário disparou uma ação de emergência (para transparência).
export const logEmergencyAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => emergencyActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("emergency_actions").insert({
      user_id: userId,
      kind: data.kind,
      metadata: (data.metadata ?? {}) as never,
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Plano de segurança do próprio usuário.
export const getMySafetyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("safety_plans")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  });

export const saveMySafetyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => safetyPlanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("safety_plans")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });

    if (error) throw new Error(error.message);
    return { ok: true };
  });
