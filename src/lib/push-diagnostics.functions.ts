import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

type JsonRow = Record<string, unknown>;

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("role check failed");
  if (!data) throw new Error("Forbidden");
}

export const getPushConfigStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const pub = process.env.VAPID_PUBLIC_KEY ?? "";
    const priv = process.env.VAPID_PRIVATE_KEY ?? "";
    const subj = process.env.VAPID_SUBJECT ?? "";
    // Basic VAPID public-key validity: base64url of 65 bytes (uncompressed P-256).
    const b64 = pub.replace(/-/g, "+").replace(/_/g, "/");
    let publicKeyBytes = 0;
    try {
      if (typeof atob === "function")
        publicKeyBytes = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)).length;
      else publicKeyBytes = Buffer.from(b64, "base64").length;
    } catch {
      publicKeyBytes = 0;
    }
    return {
      hasPublicKey: !!pub,
      hasPrivateKey: !!priv,
      hasSubject: !!subj,
      publicKeyBytes,
      publicKeyValid: publicKeyBytes === 65,
      subjectValid: subj.startsWith("mailto:") || subj.startsWith("https://"),
      publicKeyPreview: pub ? `${pub.slice(0, 12)}…${pub.slice(-6)}` : "",
      subjectPreview: subj,
    };
  });

export const getPushOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [subsResp, logs24, logs7d] = await Promise.all([
      supabaseAdmin
        .from("push_subscriptions")
        .select("id, active", { count: "exact", head: false }),
      supabaseAdmin
        .from("push_delivery_log")
        .select("success, stale, status_code, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      supabaseAdmin
        .from("push_delivery_log")
        .select("status_code, stale, success")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const subs = subsResp.data ?? [];
    const active = subs.filter((s: { active: boolean }) => s.active).length;
    const inactive = subs.length - active;

    const l24 = (logs24.data ?? []) as unknown as JsonRow[];
    const sent24 = l24.filter((r) => r.success === true).length;
    const failed24 = l24.length - sent24;
    const gone24 = l24.filter((r) => r.status_code === 410).length;
    const notFound24 = l24.filter((r) => r.status_code === 404).length;

    const byStatus: Record<string, number> = {};
    for (const r of logs7d.data ?? []) {
      const k = String((r as JsonRow).status_code ?? "null");
      byStatus[k] = (byStatus[k] ?? 0) + 1;
    }

    return {
      totalSubscriptions: subs.length,
      activeSubscriptions: active,
      inactiveSubscriptions: inactive,
      last24h: {
        sent: sent24,
        failed: failed24,
        gone: gone24,
        notFound: notFound24,
        total: l24.length,
      },
      statusBreakdown7d: byStatus,
    };
  });

export const searchPushUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ q: z.string().max(120).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = (data.q ?? "").trim();

    let query = supabaseAdmin
      .from("push_subscriptions")
      .select("user_id, endpoint, active, user_agent, last_seen_at, created_at")
      .order("last_seen_at", { ascending: false })
      .limit(50);

    if (q) {
      // match by user_id prefix or endpoint substring
      if (/^[0-9a-f-]{6,}$/i.test(q)) query = query.ilike("user_id", `${q}%`);
      else query = query.ilike("endpoint", `%${q}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    return {
      subscriptions: (rows ?? []).map((r) => ({
        user_id: r.user_id,
        endpoint_host: safeHost(r.endpoint),
        endpoint_tail: r.endpoint.slice(-14),
        active: r.active,
        user_agent: r.user_agent,
        last_seen_at: r.last_seen_at,
        created_at: r.created_at,
      })),
    };
  });

export const getUserPushLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ userId: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: logs, error } = await supabaseAdmin
      .from("push_delivery_log")
      .select(
        "id, endpoint_host, endpoint_tail, status_code, success, stale, error_body, title, tag, created_at",
      )
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw error;

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, active, user_agent, last_seen_at")
      .eq("user_id", data.userId);

    return {
      logs: logs ?? [],
      subscriptions: (subs ?? []).map((r) => ({
        endpoint_host: safeHost(r.endpoint),
        endpoint_tail: r.endpoint.slice(-14),
        active: r.active,
        user_agent: r.user_agent,
        last_seen_at: r.last_seen_at,
      })),
    };
  });

export const sendTestPushToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToUser } = await import("@/lib/push.server");
    const result = await sendPushToUser(supabaseAdmin, data.userId, {
      title: "Diagnóstico de push",
      body: "Teste enviado pelo painel administrativo.",
      url: "/inicio",
      tag: "push-diagnostic",
    });
    return result;
  });

function safeHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown";
  }
}
