import { getServerEnv } from "./server-env";

type ChatProvider = "nvidia" | "lovable";

function providerKey(name: string): string | undefined {
  return getServerEnv(name);
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
        reasoning_content?: string;
        reasoning?: string;
      };
    }[];
  };
  const message = result.choices?.[0]?.message;
  const content =
    message?.content ??
    message?.output_text ??
    result.choices?.[0]?.text ??
    message?.reasoning_content ??
    message?.reasoning;
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
  const request = async (requestBody: Record<string, unknown>) => {
    let response: Response | undefined;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(15000),
        });
        const retryable =
          response.status === 408 ||
          response.status === 425 ||
          response.status === 429 ||
          response.status >= 500;
        if (!retryable || attempt === 1) return response;
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (error) {
        lastError = error;
        if (attempt === 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    if (response) return response;
    throw lastError instanceof Error ? lastError : new Error("Falha de rede ao acessar a NVIDIA.");
  };
  let response = await request(payload);

  // Some NIM profiles reject optional structured-output parameters. Retry with
  // portable chat fields before handing the request to the fallback provider.
  if (
    !response.ok &&
    (response.status === 400 || response.status === 422) &&
    ("response_format" in payload || "chat_template_kwargs" in payload)
  ) {
    const detail = (await response.text()).slice(0, 500);
    console.warn("[NVIDIA NIM] retrying without optional chat parameters", response.status, detail);
    const portablePayload: Record<string, unknown> = { ...payload };
    delete portablePayload.response_format;
    delete portablePayload.chat_template_kwargs;
    response = await request(portablePayload);
  }

  if (response.status === 202) {
    const requestId =
      response.headers.get("nvcf-reqid") ||
      response.headers.get("nvcf-request-id") ||
      response.headers.get("x-nvcf-reqid");
    if (!requestId) throw new Error("A NVIDIA não retornou o identificador de processamento.");
    let completed = false;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
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

async function requestLovable(body: Record<string, unknown>, apiKey: string): Promise<string> {
  const endpoint = (getServerEnv("LOVABLE_BASE_URL") || "https://ai.lovable.dev/v1").replace(
    /\/$/,
    "",
  );
  const { chat_template_kwargs: _chatTemplateKwargs, ...portableBody } = body;
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      ...portableBody,
      model: getServerEnv("LOVABLE_MODEL") || "google/gemini-2.5-flash",
      stream: false,
    }),
    signal: AbortSignal.timeout(45000),
  });
  return readCompletion(response, "Lovable AI Gateway");
}

/** Use NVIDIA first and keep a compatible Lovable gateway fallback. */
export async function chatCompletionWithProvider(
  body: Record<string, unknown>,
): Promise<{ content: string; provider: ChatProvider }> {
  const failures: string[] = [];
  const nvidiaApiKey = providerKey("NVIDIA_API_KEY");
  if (nvidiaApiKey) {
    try {
      const content = await requestNvidia(body, nvidiaApiKey);
      if (content.trim()) return { content, provider: "nvidia" };
      failures.push("NVIDIA retornou resposta vazia");
    } catch (error) {
      failures.push(`NVIDIA: ${error instanceof Error ? error.message : String(error)}`);
      console.error("[ai-gateway] NVIDIA indisponível; tentando fallback Lovable", error);
    }
  } else {
    failures.push("NVIDIA_API_KEY ausente");
    console.warn("[ai-gateway] NVIDIA_API_KEY ausente; tentando fallback Lovable");
  }

  const lovableApiKey = providerKey("LOVABLE_API_KEY");
  if (lovableApiKey) {
    try {
      const content = await requestLovable(body, lovableApiKey);
      if (content.trim()) return { content, provider: "lovable" };
      failures.push("Lovable retornou resposta vazia");
    } catch (error) {
      failures.push(`Lovable: ${error instanceof Error ? error.message : String(error)}`);
      console.error("[ai-gateway] Lovable indisponível", error);
    }
  } else {
    failures.push("LOVABLE_API_KEY ausente");
  }

  throw new Error(`Nenhum provedor de IA respondeu: ${failures.join("; ")}`);
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
