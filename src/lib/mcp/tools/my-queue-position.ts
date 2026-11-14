import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

export default defineTool({
  name: "my_queue_position",
  title: "Minha posição na fila",
  description:
    "Retorna a posição do usuário conectado na fila de escuta e o tempo estimado de espera. Não expõe dados de outros usuários — apenas o próprio status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase.rpc("my_queue_position");
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.in_queue) {
      const payload = { in_queue: false };
      return {
        content: [{ type: "text", text: "Você não está na fila no momento." }],
        structuredContent: payload,
      };
    }
    const mins = Math.max(0, Math.round((row.estimated_wait_seconds ?? 0) / 60));
    const payload = {
      in_queue: true,
      position: row.queue_position,
      ahead_of_me: row.ahead_of_me,
      urgency: row.urgency,
      waiting_seconds: row.waiting_seconds,
      estimated_wait_seconds: row.estimated_wait_seconds,
      estimated_wait_minutes: mins,
      avg_service_seconds: row.avg_service_seconds,
      joined_at: row.created_at,
    };
    return {
      content: [
        {
          type: "text",
          text: `Você está na posição ${row.queue_position} da fila. Tempo estimado de espera: ~${mins} min.`,
        },
      ],
      structuredContent: payload,
    };
  },
});
