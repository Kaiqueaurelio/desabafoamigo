import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assessRisk, parseAiJson, FALLBACK_REPLY } from "./aiSafety";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `Você é o "Amigo IA" do Desabafo Amigo, um acolhimento emocional por texto em português do Brasil.
Regras: seja empático, natural e breve (2-5 frases); faça perguntas abertas; sugira respiração/autocuidado simples quando fizer sentido.
NUNCA diagnostique, prescreva medicamentos, faça psicoterapia ou diga que substitui profissionais ou serviços de emergência.
Lembre que existe um voluntário humano disponível se a pessoa quiser. Em sinais de risco, indique CVV 188 e SAMU 192.
Não peça dados pessoais (nome, endereço, documentos).
Responda APENAS em JSON: {"reply":"texto","severity":0-3} onde severity: 0 sem risco, 1 sofrimento leve, 2 sofrimento grave, 3 risco iminente. Na dúvida, escolha o nível maior.`;

async function callNvidia(messages: unknown[]): Promise<string> {
  const k = process.env.NVIDIA_API_KEY;
  if (!k) throw new Error("no nvidia");
  const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
    body: JSON.stringify({ model: "meta/llama-3.1-70b-instruct", messages, temperature: 0.6, max_tokens: 500 }),
  });
  if (!r.ok) throw new Error(`nvidia ${r.status}`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: Msg[] }) => ({
    messages: (Array.isArray(d?.messages) ? d.messages : [])
      .slice(-12)
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
  }))
  .handler(async ({ data }) => {
    const last = [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!last.trim()) throw new Error("Mensagem vazia");
    const messages = [{ role: "system", content: SYSTEM }, ...data.messages];
    let raw = "";
    let provider: "nvidia" | "lovable" | "none" = "none";
    try { raw = await callNvidia(messages); provider = "nvidia"; }
    catch (e) {
      console.error("[aiChat] nvidia falhou", e instanceof Error ? e.message : e);
      try {
        const { chatCompletion } = await import("./ai-gateway.server");
        raw = await chatCompletion({ model: "google/gemini-3-flash-preview", messages });
        provider = "lovable";
      } catch (e2) { console.error("[aiChat] gateway falhou", e2 instanceof Error ? e2.message : e2); }
    }
    const parsed = raw ? parseAiJson(raw) : null;
    const risk = assessRisk(last, parsed?.severity ?? null);
    return { reply: parsed?.reply ?? FALLBACK_REPLY, risk, provider, degraded: !parsed };
  });
