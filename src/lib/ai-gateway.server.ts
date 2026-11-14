import { getServerEnv } from "./server-env";

type ChatProvider = "nvidia";

function nvidiaKey(): string {
  const value = getServerEnv("NVIDIA_API_KEY");
  const normalized = value
    ?.replace(/^Bearer\s+/i, "")
    .replace(/^['"]|['"]$/g, "")
    .trim();
  if (!normalized) throw new Error("NVIDIA_API_KEY não está configurada no servidor.");
  return normalized;
}

function modelFor(body: Record<string, unknown>): string {
  const hasImage = JSON.stringify(body.messages ?? []).includes("image_url");
  return hasImage
    ? getServerEnv("NVIDIA_VISION_MODEL") ||
        getServerEnv("NVIDIA_MODEL") ||
        "meta/llama-3.2-11b-vision-instruct"
    : getServerEnv("NVIDIA_MODEL") || "nvidia/nemotron-3.5-lightning-30b-a3b";
}

function extractContent(data: unknown): string {
  const result = data as {
    choices?: {
      text?: string;
      message?: {
        content?: string | Array<{ type?: string; text?: string }> | null;
        output_text?: string;
      };
    }[];
  };
  const message = result.choices?.[0]?.message;
  const content = message?.content ?? message?.output_text ?? result.choices?.[0]?.text;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");
  return "";
}

async function readCompletion(response: Response, provider: string): Promise<string> {
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    console.error(`[${provider}] chat completion failed`, response.status, detail);
    throw new Error(
      response.status === 401
        ? `A credencial do provedor ${provider} não foi aceita.`
        : response.status === 429
          ? `O provedor ${provider} está temporariamente ocupado.`
          : `Falha no provedor ${provider} (HTTP ${response.status}).`,
    );
  }
  return extractContent(await response.json());
}

async function requestNvidia(body: Record<string, unknown>, apiKey: string): Promise<string> {
  const baseUrl = (
    getServerEnv("NVIDIA_BASE_URL") || "https://integrate.api.nvidia.com/v1"
  ).replace(/\/$/, "");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  const payload = { ...body, model: modelFor(body), stream: false };
  const request = (requestBody: Record<string, unknown>) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });
  let response = await request(payload);

  // Some NIM profiles reject optional structured-output parameters. Retry with
  // portable chat fields while keeping NVIDIA as the only provider.
  if (
    !response.ok &&
    (response.status === 400 || response.status === 422) &&
    ("response_format" in payload || "chat_template_kwargs" in payload)
  ) {
    const detail = (await response.text()).slice(0, 500);
    console.warn("[NVIDIA NIM] retrying without optional chat parameters", response.status, detail);
    const {
      response_format: _responseFormat,
      chat_template_kwargs: _chatTemplateKwargs,
      ...portablePayload
    } = payload;
    response = await request(portablePayload);
  }

  if (response.status === 202) {
    const requestId =
      response.headers.get("nvcf-reqid") ||
      response.headers.get("nvcf-request-id") ||
      response.headers.get("x-nvcf-reqid");
    if (!requestId) throw new Error("A NVIDIA não retornou o identificador de processamento.");
    let completed = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      response = await fetch(`${baseUrl}/status/${encodeURIComponent(requestId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      });
      if (response.status !== 202) {
        completed = true;
        break;
      }
    }
    if (!completed) throw new Error("A NVIDIA ainda está processando a resposta.");
  }
  return readCompletion(response, "NVIDIA NIM");
}

/** NVIDIA NIM é o único provedor de chat usado pelo aplicativo. */
export async function chatCompletionWithProvider(
  body: Record<string, unknown>,
): Promise<{ content: string; provider: ChatProvider }> {
  const content = await requestNvidia(body, nvidiaKey());
  if (!content.trim()) throw new Error("A NVIDIA retornou uma resposta vazia.");
  return { content, provider: "nvidia" };
}

/** Compatibilidade para chamadas existentes que só precisam do texto. */
export async function chatCompletion(body: Record<string, unknown>): Promise<string> {
  const result = await chatCompletionWithProvider(body);
  return result.content;
}

export type TranscriptSegment = { start: number; end: number; text: string };
export type TranscriptionResult = { text: string; segments: TranscriptSegment[] };

/**
 * Optional self-hosted NVIDIA Riva HTTP endpoint. NVIDIA-hosted Parakeet currently
 * documents gRPC for the hosted endpoint, so this does not guess an HTTP URL.
 */
export async function transcribeAudio(file: Blob, filename: string): Promise<TranscriptionResult> {
  const apiKey = getServerEnv("NVIDIA_API_KEY_ASR") || getServerEnv("NVIDIA_API_KEY");
  if (!apiKey) {
    throw new Error("Configure NVIDIA_API_KEY_ASR no servidor para ativar a transcrição NVIDIA.");
  }

  const selfHostedEndpoint = getServerEnv("NVIDIA_ASR_HTTP_URL");
  const functionId = getServerEnv("NVIDIA_ASR_FUNCTION_ID");
  const endpoint =
    selfHostedEndpoint ||
    (functionId
      ? `https://${functionId}.invocation.api.nvcf.nvidia.com/v1/audio/transcriptions`
      : "");

  if (!endpoint) {
    throw new Error(
      "Configure NVIDIA_ASR_FUNCTION_ID com o identificador do modelo ASR habilitado na NVIDIA. A conversa por voz continua disponível com o reconhecimento do navegador.",
    );
  }

  const form = new FormData();
  form.append("file", file, filename);
  form.append("language", getServerEnv("NVIDIA_ASR_LANGUAGE") || "pt-BR");
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
    throw new Error(
      response.status === 401
        ? "A credencial NVIDIA de transcrição não foi aceita."
        : response.status === 429
          ? "O serviço NVIDIA de transcrição está ocupado. Tente novamente."
          : `Falha na transcrição NVIDIA (HTTP ${response.status}).`,
    );
  }
  const data = (await response.json()) as {
    text?: string;
    segments?: { start: number; end: number; text: string }[];
  };
  return {
    text: data.text ?? "",
    segments: (data.segments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      text: s.text,
    })),
  };
}
