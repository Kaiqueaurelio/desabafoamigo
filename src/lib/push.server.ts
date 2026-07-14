// Server-only helper for sending Web Push notifications.
// Filename ends in `.server.ts` so it is blocked from client bundles.
import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
  data?: Record<string, unknown>;
};

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || "mailto:admin@desabafo.br";
  if (!pub || !priv) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails(subj, pub, priv);
  configured = true;
}

export async function sendPushToUser(
  supabaseAdmin: any,
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  ensureConfigured();
  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("active", true);
  if (error || !subs || subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];
  const jsonPayload = JSON.stringify(payload);
  const logRows: Array<Record<string, unknown>> = [];

  await Promise.all(
    subs.map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      const host = safeHost(s.endpoint);
      const tail = s.endpoint.slice(-12);
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          jsonPayload,
          { TTL: 3600 },
        );
        sent += 1;
        logRows.push({
          user_id: userId,
          subscription_id: s.id,
          endpoint_host: host,
          endpoint_tail: tail,
          status_code: 201,
          success: true,
          stale: false,
          title: payload.title?.slice(0, 200) ?? null,
          tag: payload.tag ?? null,
        });
      } catch (err: any) {
        failed += 1;
        const status = err?.statusCode ?? null;
        const isStale = status === 404 || status === 410;
        if (isStale) staleIds.push(s.id);
        else console.warn("[push] delivery failed", status, err?.body);
        logRows.push({
          user_id: userId,
          subscription_id: s.id,
          endpoint_host: host,
          endpoint_tail: tail,
          status_code: status,
          success: false,
          stale: isStale,
          error_body: typeof err?.body === "string" ? err.body.slice(0, 500) : (err?.message ?? "unknown").slice(0, 500),
          title: payload.title?.slice(0, 200) ?? null,
          tag: payload.tag ?? null,
        });
      }
    }),
  );

  if (staleIds.length) {
    await supabaseAdmin
      .from("push_subscriptions")
      .update({ active: false })
      .in("id", staleIds);
  }

  if (logRows.length) {
    await supabaseAdmin.from("push_delivery_log").insert(logRows);
  }

  return { sent, failed };
}

function safeHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "unknown";
  }
}

export async function sendPushToRole(
  supabaseAdmin: any,
  role: "admin" | "volunteer" | "user",
  payload: PushPayload,
): Promise<{ recipients: number; sent: number; failed: number }> {
  ensureConfigured();
  const { data: roleRows } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", role);
  const userIds: string[] = Array.from(new Set((roleRows ?? []).map((r: { user_id: string }) => r.user_id)));
  if (!userIds.length) return { recipients: 0, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  await Promise.all(
    userIds.map(async (uid) => {
      const r = await sendPushToUser(supabaseAdmin, uid, payload);
      sent += r.sent;
      failed += r.failed;
    }),
  );
  return { recipients: userIds.length, sent, failed };
}
