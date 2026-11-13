const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");

function nvidiaKey(): string {
  const value = process.env.NVIDIA_API_KEY;
  if (!value) throw new Error("NVIDIA_API_KEY não está configurada no servidor.");
  return value;
}

function modelFor(body: Record<string, unknown>): string {
  const hasImage = JSON.stringify(body.messages ?? []).includes("image_url");
  return hasImage
    ? process.env.NVIDIA_VISION_MODEL || process.env.NVIDIA_MODEL || "meta/llama-3.2-11b-vision-instruct"
    : process.env.NVIDIA_MODEL || "meta/llama-3.1-8b-instruct";
}

/** Gateway único NVIDIA NIM; nenhuma chamada ou chave Lovable no runtime. */
export async function chatCompletion(body: Record<string, unknown>): Promise<string> {
  const payload = { ...body, model: modelFor(body), stream: false };
  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${nvidiaKey()}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("[NVIDIA NIM] chat completion failed", response.status, detail);
    throw new Error(response.status === 401 ? "A chave NVIDIA_API_KEY não foi aceita." : response.status === 429 ? "A NVIDIA está temporariamente ocupada. Tente novamente." : `Falha no serviço NVIDIA (HTTP ${response.status}).`);
  }
  const result = await response.json() as { choices?: { message?: { content?: string | Array<{type?: string; text?: string}> } }[] };
  const content = result.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");
  return "";
}

export type TranscriptSegment = { start: number; end: number; text: string };
export type TranscriptionResult = { text: string; segments: TranscriptSegment[] };

/**
 * Optional self-hosted NVIDIA Riva HTTP endpoint. NVIDIA-hosted Parakeet currently
 * documents gRPC for the hosted endpoint, so this does not guess an HTTP URL.
 */
export async function transcribeAudio(file: Blob, filename: string): Promise<TranscriptionResult> {
  const apiKey = process.env.NVIDIA_API_KEY_ASR || process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("Configure NVIDIA_API_KEY_ASR no servidor para ativar a transcrição NVIDIA.");
  }

  const selfHostedEndpoint = process.env.NVIDIA_ASR_HTTP_URL;
  const functionId = process.env.NVIDIA_ASR_FUNCTION_ID;
  const endpoint = selfHostedEndpoint || (functionId
    ? `https://${functionId}.invocation.api.nvcf.nvidia.com/v1/audio/transcriptions`
    : "");

  if (!endpoint) {
    throw new Error("Configure NVIDIA_ASR_FUNCTION_ID com o identificador do modelo ASR habilitado na NVIDIA. A conversa por voz continua disponível com o reconhecimento do navegador.");
  }

  const form = new FormData();
  form.append("file", file, filename);
  form.append("language", process.env.NVIDIA_ASR_LANGUAGE || "pt-BR");
  form.append("response_format", "json");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    console.error("[NVIDIA ASR] transcription failed", response.status, detail);
    throw new Error(response.status === 401
      ? "A credencial NVIDIA de transcrição não foi aceita."
      : response.status === 429
        ? "O serviço NVIDIA de transcrição está ocupado. Tente novamente."
        : `Falha na transcrição NVIDIA (HTTP ${response.status}).`);
  }
  const data = await response.json() as { text?: string; segments?: { start: number; end: number; text: string }[] };
  return { text: data.text ?? "", segments: (data.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text })) };
}
