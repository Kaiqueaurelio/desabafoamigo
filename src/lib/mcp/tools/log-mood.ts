import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "log_mood",
  title: "Registrar humor",
  description:
    "Registra uma anotação de humor (1 a 5) no diário do usuário conectado. Opcionalmente inclui uma nota curta.",
  inputSchema: {
    mood: z.number().int().min(1).max(5).describe("Nível de humor de 1 (muito difícil) a 5 (muito bem)."),
    note: z.string().trim().max(500).optional().describe("Anotação opcional sobre como está se sentindo."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ mood, note }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    const { data, error } = await supabase
      .from("mood_entries")
      .insert({ user_id: ctx.getUserId(), mood, note: note ?? null })
      .select("id, mood, note, created_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Humor ${mood} registrado.` }],
      structuredContent: { entry: data },
    };
  },
});
