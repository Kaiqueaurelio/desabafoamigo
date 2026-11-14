import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const createSchema = z.object({
  kind: z.enum(["export", "delete"]),
  format: z.enum(["json", "csv"]).optional(),
  password: z.string().min(1, "Confirme sua senha para prosseguir."),
});

/**
 * Turn a list of row objects into a CSV string. Safe for values that may
 * contain commas, quotes or newlines. Nested values are JSON-stringified.
 */
function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const cols = Array.from(
    rows.reduce<Set<string>>((s, r) => {
      Object.keys(r).forEach((k) => s.add(k));
      return s;
    }, new Set()),
  );
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

async function reauthenticate(email: string, password: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}

/**
 * Kick off a LGPD request. Re-authenticates the user with their password
 * to confirm intent, opens a tracked row (status=processing) and executes
 * the action asynchronously via ctx.waitUntil so the client can subscribe
 * to realtime status updates.
 */
export const createLgpdRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims.email as string | undefined) ?? "";
    if (!email) throw new Error("Não foi possível identificar seu e-mail.");

    const ok = await reauthenticate(email, data.password);
    if (!ok) throw new Error("Senha incorreta. Confirme sua identidade para prosseguir.");

    const { data: row, error } = await supabase
      .from("lgpd_requests")
      .insert({
        user_id: userId,
        kind: data.kind,
        format: data.kind === "export" ? (data.format ?? "json") : null,
        status: "processing",
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao registrar a solicitação.");

    await supabase.rpc("log_audit", {
      _action: data.kind === "export" ? "lgpd.export.requested" : "lgpd.delete.requested",
      _target_type: "lgpd_request",
      _target_id: row.id,
      _metadata: { format: data.format ?? null },
    });

    // Execute processing but don't block the response — the client subscribes
    // to realtime updates on lgpd_requests to see the transition.
    void processRequest(row.id, data.kind, data.format ?? "json", userId).catch(async (e) => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("lgpd_requests")
        .update({
          status: "failed",
          error: e?.message ?? "Erro desconhecido",
          completed_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    });

    return { id: row.id };
  });

/**
 * Long-running processor. Uses the admin client so it isn't tied to the
 * caller's session lifetime.
 */
async function processRequest(
  requestId: string,
  kind: "export" | "delete",
  format: "json" | "csv",
  userId: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (kind === "export") {
    const [profile, moods, appts, myMsgs, ratings, favorites, nps, summaries] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("mood_entries").select("*").eq("user_id", userId),
      supabaseAdmin
        .from("appointments")
        .select("id, scheduled_at, topic, status, created_at")
        .or(`patient_id.eq.${userId},professional_id.eq.${userId}`),
      supabaseAdmin
        .from("messages")
        .select("id, conversation_id, content, transcription, created_at")
        .eq("sender_id", userId)
        .limit(5000),
      supabaseAdmin
        .from("appointments")
        .select("id, patient_rating, patient_feedback")
        .eq("patient_id", userId),
      supabaseAdmin.from("favorite_volunteers").select("*").eq("user_id", userId),
      supabaseAdmin.from("nps_responses").select("*").eq("user_id", userId),
      supabaseAdmin.from("user_summaries").select("*").eq("user_id", userId),
    ]);

    const payload = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data ?? null,
      mood_entries: moods.data ?? [],
      appointments: appts.data ?? [],
      messages_sent: myMsgs.data ?? [],
      ratings: ratings.data ?? [],
      favorite_volunteers: favorites.data ?? [],
      nps_responses: nps.data ?? [],
      user_summaries: summaries.data ?? [],
    };

    let body: string;
    let contentType: string;
    let ext: string;
    if (format === "csv") {
      // Multi-section CSV: one block per table for portability.
      const sections: string[] = [];
      const push = (name: string, rows: unknown) => {
        const arr = Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
        sections.push(`# ${name}\n${toCsv(arr) || "(vazio)"}`);
      };
      push("profile", payload.profile ? [payload.profile] : []);
      push("mood_entries", payload.mood_entries);
      push("appointments", payload.appointments);
      push("messages_sent", payload.messages_sent);
      push("ratings", payload.ratings);
      push("favorite_volunteers", payload.favorite_volunteers);
      push("nps_responses", payload.nps_responses);
      push("user_summaries", payload.user_summaries);
      body = sections.join("\n\n");
      contentType = "text/csv; charset=utf-8";
      ext = "csv";
    } else {
      body = JSON.stringify(payload, null, 2);
      contentType = "application/json; charset=utf-8";
      ext = "json";
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${userId}/${stamp}-${requestId}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("lgpd-exports")
      .upload(path, new Blob([body], { type: contentType }), {
        contentType,
        upsert: false,
      });
    if (upErr) throw new Error(upErr.message);

    await supabaseAdmin
      .from("lgpd_requests")
      .update({
        status: "completed",
        file_path: path,
        completed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    return;
  }

  // kind === "delete"
  await supabaseAdmin.from("lgpd_requests").update({ status: "processing" }).eq("id", requestId);
  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (delErr) throw new Error(delErr.message);
  // Row is cascaded away when the user is deleted, so best-effort update:
  await supabaseAdmin
    .from("lgpd_requests")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", requestId);
}

/**
 * Return the user's requests, newest first.
 */
export const listLgpdRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lgpd_requests")
      .select("id, kind, format, status, file_path, error, created_at, completed_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Signed URL (10 min) to download an export file the caller owns.
 */
export const getLgpdDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: req, error } = await context.supabase
      .from("lgpd_requests")
      .select("file_path, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req || req.user_id !== context.userId) throw new Error("Solicitação não encontrada.");
    if (req.status !== "completed" || !req.file_path)
      throw new Error("Arquivo ainda não está pronto.");

    const { data: signed, error: signErr } = await context.supabase.storage
      .from("lgpd-exports")
      .createSignedUrl(req.file_path, 60 * 10);
    if (signErr || !signed) throw new Error(signErr?.message ?? "Falha ao gerar link de download.");
    return { url: signed.signedUrl };
  });
