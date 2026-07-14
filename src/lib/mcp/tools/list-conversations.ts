import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_my_conversations",
  title: "Listar minhas conversas",
  description:
    "Lista as conversas do usuário conectado (como pessoa acolhida ou como voluntário), com status e datas. Respeita o controle de acesso: cada chamador só vê as próprias conversas.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Quantidade máxima de conversas a retornar."),
    status: z
      .enum(["active", "ended", "waiting"])
      .optional()
      .describe("Filtrar por status. Omitir traz todas."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
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
    let query = supabase
      .from("conversations")
      .select("id, status, user_alias, volunteer_alias, created_at, ended_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { conversations: data ?? [] },
    };
  },
});
