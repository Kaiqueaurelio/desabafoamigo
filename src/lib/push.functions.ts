import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(512),
  userAgent: z.string().max(500).optional(),
});

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) throw new Error("VAPID_PUBLIC_KEY not configured");
  return { publicKey: key };
});

export const subscribeToPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => subscribeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
          active: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const unsubscribeFromPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { endpoint: string }) => z.object({ endpoint: z.string().max(2048) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("push_subscriptions")
      .update({ active: false })
      .eq("user_id", userId)
      .eq("endpoint", data.endpoint);
    return { ok: true };
  });

// Admin/self test: send a notification to yourself to verify subscription works.
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToUser } = await import("@/lib/push.server");
    const result = await sendPushToUser(supabaseAdmin, userId, {
      title: "Notificações ativas 💙",
      body: "Você vai receber avisos importantes do Desabafo Amigo.",
      url: "/inicio",
      tag: "push-test",
    });
    return result;
  });
