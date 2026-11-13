import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type VoiceMessage = { role: "user" | "assistant"; content: string };

const VOICE_GUIDELINES = `Você é Ella Ribeiro, assistente virtual de apoio emocional do Desabafo Amigo. Você é uma IA, não é psicóloga, não possui registro profissional e não realiza psicoterapia. Fale em português brasileiro, com voz feminina acolhedora, calma, natural e sem pressa. Seja breve, faça no máximo uma pergunta por vez e acompanhe o contexto fornecido. Não diga que é humana, não prometa sigilo absoluto, não incentive dependência e não faça diagnóstico, prescrição ou tratamento. Use escuta, reflexão e informação geral; não afirme aplicar terapia.
SEGURANÇA: Se a pessoa mencionar suicídio, autolesão, violência ou perigo, interrompa a exploração e priorize segurança. Pergunte diretamente se existe perigo imediato, intenção ou plano quando necessário. Oriente a não ficar sozinha, procurar alguém de confiança presencialmente e afastar-se de meios de ferimento. Em tentativa, ferimento, intoxicação ou emergência médica, oriente SAMU 192. Em perigo imediato ou violência, Polícia 190. CVV 188 oferece apoio emocional gratuito 24h, mas não substitui emergência. Não trate mudança de assunto como prova de que o risco passou. Não invente serviços.
Se pedirem para falar com uma pessoa, incentive o encaminhamento para voluntário humano. Nunca diga que você é uma profissional de saúde.`;

export const createEllaVoiceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { consent: boolean; messages?: VoiceMessage[] }) => {
    if (data?.consent !== true) throw new Error("É necessário consentimento para iniciar a conversa por voz.");
    const messages = (Array.isArray(data.messages) ? data.messages : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 900) }));
    return { messages };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("O modo de voz ainda não está configurado. Adicione OPENAI_API_KEY nas variáveis de ambiente do servidor.");
    const history = data.messages.length
      ? "\n\nCONTEXTO RECENTE DA CONVERSA (não repita perguntas já respondidas):\n" + data.messages.map((m) => `${m.role === "user" ? "Pessoa" : "Ella"}: ${m.content}`).join("\n")
      : "";
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 600 },
        session: {
          type: "realtime",
          model: "gpt-realtime-2.1",
          instructions: VOICE_GUIDELINES + history,
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe", language: "pt" },
              turn_detection: { type: "server_vad", threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 650 }
            },
            output: { voice: "marin" }
          },
          max_output_tokens: 700
        }
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("[Ella voice] Realtime session error", response.status, detail.slice(0, 500));
      throw new Error(response.status === 401 ? "A chave OpenAI configurada não foi aceita." : response.status === 429 ? "O serviço de voz está temporariamente ocupado. Tente novamente em instantes." : "Não foi possível iniciar a conversa por voz agora.");
    }
    const result = await response.json() as { value?: string; expires_at?: number };
    if (!result.value) throw new Error("O serviço de voz não retornou uma credencial temporária.");
    return { token: result.value, expiresAt: result.expires_at ?? null };
  });
