import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TTS_FUNCTION_ID =
  process.env.NVIDIA_TTS_FUNCTION_ID || "877104f7-e885-42b9-8de8-f6e4c6303969";

async function resolveBrazilianVoice(apiKey: string): Promise<string> {
  if (process.env.NVIDIA_TTS_VOICE) return process.env.NVIDIA_TTS_VOICE;
  const response = await fetch(
    `https://${TTS_FUNCTION_ID}.invocation.api.nvcf.nvidia.com/v1/audio/list_voices`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new Error("Não foi possível consultar as vozes disponíveis no NVIDIA Magpie.");
  const payload: unknown = await response.json();
  const collect = (value: unknown): string[] => {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(collect);
    if (value && typeof value === "object") return Object.values(value).flatMap(collect);
    return [];
  };
  const voices = collect(payload);
  const brazilian = voices.filter((voice) => /pt[-_]BR/i.test(voice));
  const selected = brazilian.find((voice) => /mia|female|feminina/i.test(voice)) || brazilian[0];
  if (!selected)
    throw new Error(
      "O NVIDIA Magpie não retornou uma voz pt-BR. Configure NVIDIA_TTS_VOICE com um identificador disponível.",
    );
  return selected;
}

export const synthesizeEllaSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { consent: boolean; text: string }) => {
    if (data?.consent !== true) throw new Error("É necessário consentimento para gerar áudio.");
    const text = typeof data.text === "string" ? data.text.trim().slice(0, 1200) : "";
    if (!text) throw new Error("Texto vazio para síntese.");
    return { text };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.NVIDIA_API_KEY_VOICE || process.env.NVIDIA_API_KEY;
    if (!apiKey)
      throw new Error("Configure NVIDIA_API_KEY_VOICE no servidor para ativar a voz NVIDIA.");
    const form = new FormData();
    form.append("text", data.text);
    form.append("language", "pt-BR");
    form.append("voice", await resolveBrazilianVoice(apiKey));
    form.append("encoding", "LINEAR_PCM");
    form.append("sample_rate_hz", "44100");
    const response = await fetch(
      `https://${TTS_FUNCTION_ID}.invocation.api.nvcf.nvidia.com/v1/audio/synthesize`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(45000),
      },
    );
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error("[Ella TTS] NVIDIA request failed", response.status, detail);
      throw new Error(
        response.status === 401
          ? "A credencial de voz NVIDIA não foi aceita."
          : response.status === 429
            ? "O serviço de voz NVIDIA está ocupado. Tente novamente."
            : `Não foi possível gerar a voz NVIDIA (HTTP ${response.status}).`,
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 12_000_000)
      throw new Error("O serviço NVIDIA retornou um áudio inválido ou muito grande.");
    return { audioBase64: bytes.toString("base64"), mimeType: "audio/wav" };
  });
