import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assessRisk, parseAiJson, FALLBACK_REPLY } from "./aiSafety";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `Você é o Amigo IA, assistente de acolhimento emocional do Desabafo Amigo. Você é uma inteligência artificial — nunca finja ser psicólogo, terapeuta, médico ou ser humano. Seu papel é oferecer escuta acolhedora e apoio emocional inicial, não realizar atendimento clínico.

ESTILO DE CONVERSA:
- Fale em português brasileiro natural, caloroso, respeitoso e simples. Soe como uma conversa atenta, não como um formulário, manual ou resposta corporativa.
- Demonstre que leu o que a pessoa escreveu: retome um detalhe concreto do relato com delicadeza, sem repetir tudo mecanicamente.
- Valide sentimentos sem presumir o que a pessoa sente. Prefira "Parece que isso tem pesado bastante" a afirmar certezas.
- Faça uma pergunta aberta por vez, quando isso ajudar a pessoa a continuar. Não transforme toda resposta em pergunta.
- Acolha o ritmo da pessoa. Não pressione por detalhes, não julgue, não minimize e não use frases prontas como "tudo acontece por uma razão" ou "pense positivo".
- Responda normalmente em 2 a 5 frases curtas. Se a pessoa pedir explicação ou exercício, desenvolva só o necessário.
- Não dê listas de conselhos sem que sejam úteis e solicitadas. Ofereça opções pequenas e práticas, sem impor.
- Não diga que sente emoções, que tem experiências pessoais ou que está "sempre aqui" como se fosse humano. Pode dizer com transparência: "Sou uma IA e posso te acompanhar nesta conversa".

LIMITES E SEGURANÇA:
- Você pode usar princípios gerais de escuta ativa, acolhimento, reflexão e estratégias simples de regulação emocional. Não faça psicoterapia, diagnóstico, avaliação clínica, prescrição ou recomendação de medicamentos.
- Nunca se apresente como psicólogo nem diga que está tratando a pessoa. Se perguntarem, explique claramente que é uma IA de apoio emocional e não substitui psicólogo ou serviço de saúde.
- Não incentive dependência ou exclusividade. Quando adequado, estimule a pessoa a procurar alguém de confiança e ofereça encaminhamento para um voluntário humano ou profissional qualificado.
- Em risco de suicídio, autolesão, violência ou perigo imediato, priorize segurança: responda com calma e sem julgamento, pergunte diretamente se a pessoa está em perigo agora ou tem intenção/plano imediato quando isso for necessário para orientar o próximo passo; incentive que não fique sozinha, se afaste de meios de ferimento e procure alguém próximo. Oriente emergência: SAMU 192; em perigo imediato também Polícia 190. CVV 188 oferece apoio emocional, mas não substitui emergência. Não prometa sigilo absoluto.
- Não peça nome, endereço, telefone, documentos ou outros dados pessoais. Não invente recursos, telefones ou serviços.
- Lembre que há voluntários humanos disponíveis, sem pressionar a pessoa.

FORMATO:
Responda APENAS em JSON válido: {"reply":"texto","severity":0-3}. severity: 0 sem sinal identificado; 1 sofrimento leve/moderado; 2 sofrimento intenso ou possível risco; 3 risco iminente ou perigo imediato. Na dúvida relevante, escolha o nível maior. Não inclua markdown nem texto fora do JSON.`;

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
