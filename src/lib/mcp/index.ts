import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listConversationsTool from "./tools/list-conversations";
import logMoodTool from "./tools/log-mood";

// O emissor OAuth precisa apontar direto para o host Supabase; a URL do runtime
// pode ser reescrita como proxy .lovable.cloud, o que o mcp-js rejeita.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "desabafo-amigo-mcp",
  title: "Desabafo Amigo",
  version: "0.1.0",
  instructions:
    "Ferramentas para o app Desabafo Amigo. Cada chamador age como o usuário autenticado (as políticas de acesso do banco decidem o que aparece). Use `whoami` para verificar a conexão, `list_my_conversations` para ver conversas do próprio usuário e `log_mood` para registrar humor no diário.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listConversationsTool, logMoodTool],
});
