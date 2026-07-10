const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";

function key(): string {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY não configurada");
  return k;
}

export async function chatCompletion(body: Record<string, unknown>): Promise<string> {
  const r = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key()}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`AI gateway ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { choices: { message: { content: string } }[] };
  return j.choices[0]?.message?.content ?? "";
}

export type TranscriptSegment = { start: number; end: number; text: string };
export type TranscriptionResult = { text: string; segments: TranscriptSegment[] };

export async function transcribeAudio(file: Blob, filename: string): Promise<TranscriptionResult> {
  // Try whisper-1 first (supports verbose_json with segment timestamps).
  const fd = new FormData();
  fd.append("model", "openai/whisper-1");
  fd.append("response_format", "verbose_json");
  fd.append("timestamp_granularities[]", "segment");
  fd.append("file", file, filename);
  let r = await fetch(`${GATEWAY_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}` },
    body: fd,
  });
  if (r.ok) {
    const j = (await r.json()) as { text: string; segments?: { start: number; end: number; text: string }[] };
    return {
      text: j.text ?? "",
      segments: (j.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: (s.text ?? "").trim() })),
    };
  }

  // Fallback: model without timing support.
  const fd2 = new FormData();
  fd2.append("model", "openai/gpt-4o-mini-transcribe");
  fd2.append("file", file, filename);
  r = await fetch(`${GATEWAY_URL}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}` },
    body: fd2,
  });
  if (!r.ok) throw new Error(`STT ${r.status}: ${await r.text()}`);
  const j = (await r.json()) as { text: string };
  return { text: j.text ?? "", segments: [] };
}
