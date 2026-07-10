import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Segment = { start: number; end: number; text: string };

export const transcribeMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messageId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msg, error } = await supabase
      .from("messages")
      .select("id, conversation_id, transcription, segments, attachment_id")
      .eq("id", data.messageId)
      .maybeSingle();
    if (error || !msg?.attachment_id) throw new Error("Mensagem inválida");
    if (msg.transcription && msg.segments) {
      return { text: msg.transcription, segments: msg.segments as Segment[] };
    }

    const { data: att } = await supabase
      .from("attachments").select("storage_path, mime_type, kind, original_name")
      .eq("id", msg.attachment_id).maybeSingle();
    if (!att || (att.kind !== "audio" && att.kind !== "video")) throw new Error("Sem áudio");

    const { data: signed } = await supabase.storage
      .from("consultation-files").createSignedUrl(att.storage_path, 120);
    if (!signed?.signedUrl) throw new Error("Falha ao ler arquivo");

    const fileRes = await fetch(signed.signedUrl);
    const blob = await fileRes.blob();
    const { transcribeAudio } = await import("./ai-gateway.server");
    const result = await transcribeAudio(blob, att.original_name ?? "audio.webm");

    await supabase.from("messages").update({
      transcription: result.text,
      segments: result.segments,
    }).eq("id", msg.id);
    return { text: result.text, segments: result.segments };
  });

export const translateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messageId: string; targetLang: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msg } = await supabase
      .from("messages")
      .select("id, content, transcription, segments, translations, translation_segments")
      .eq("id", data.messageId).maybeSingle();
    if (!msg) throw new Error("Mensagem inválida");
    const source = msg.content ?? msg.transcription ?? "";
    if (!source.trim()) throw new Error("Nada para traduzir");

    const cache = (msg.translations as Record<string, string> | null) ?? {};
    const segCache = (msg.translation_segments as Record<string, Segment[]> | null) ?? {};
    const segments = (msg.segments as Segment[] | null) ?? [];

    if (cache[data.targetLang] && (segments.length === 0 || segCache[data.targetLang])) {
      return { text: cache[data.targetLang], segments: segCache[data.targetLang] ?? [] };
    }

    const { chatCompletion } = await import("./ai-gateway.server");

    // If we have timed segments, translate segment-by-segment preserving alignment.
    if (segments.length > 0) {
      const numbered = segments.map((s, i) => `${i + 1}. ${s.text}`).join("\n");
      const raw = await chatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Traduza cada linha numerada para "${data.targetLang}", mantendo a mesma ordem e a mesma quantidade de linhas. Responda APENAS um JSON: {"lines":["tradução da linha 1","tradução da linha 2", ...]}. Não junte nem divida linhas.`,
          },
          { role: "user", content: numbered },
        ],
        response_format: { type: "json_object" },
      });
      let lines: string[] = [];
      try {
        const parsed = JSON.parse(raw) as { lines?: string[] };
        lines = Array.isArray(parsed.lines) ? parsed.lines : [];
      } catch { lines = []; }
      // Ensure length matches by padding/truncating.
      while (lines.length < segments.length) lines.push("");
      lines = lines.slice(0, segments.length);
      const translatedSegs: Segment[] = segments.map((s, i) => ({ start: s.start, end: s.end, text: lines[i] ?? "" }));
      const fullText = translatedSegs.map((s) => s.text).join(" ").trim();
      cache[data.targetLang] = fullText;
      segCache[data.targetLang] = translatedSegs;
      await supabase.from("messages").update({
        translations: cache,
        translation_segments: segCache,
      }).eq("id", msg.id);
      return { text: fullText, segments: translatedSegs };
    }

    // Fallback: single-shot translation without timings.
    const translated = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `Você é um tradutor profissional. Traduza fielmente o texto do usuário para o idioma "${data.targetLang}". Responda somente com a tradução, sem comentários.` },
        { role: "user", content: source },
      ],
    });
    cache[data.targetLang] = translated;
    await supabase.from("messages").update({ translations: cache }).eq("id", msg.id);
    return { text: translated, segments: [] as Segment[] };
  });

export const summarizeConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: conv } = await supabase.from("conversations").select("id, user_id").eq("id", data.conversationId).maybeSingle();
    if (!conv) throw new Error("Conversa inválida");
    const { data: msgs } = await supabase.from("messages")
      .select("sender_id, content, transcription")
      .eq("conversation_id", data.conversationId).order("created_at");
    // Redação básica de PII antes de enviar ao modelo
    const redactPII = (s: string) => s
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]")
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[CNPJ]")
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL]")
      .replace(/\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, "[TELEFONE]")
      .replace(/\b\d{5}-?\d{3}\b/g, "[CEP]")
      .replace(/\bhttps?:\/\/\S+/g, "[LINK]");
    const lines = (msgs ?? []).map((m) => {
      const who = m.sender_id === conv.user_id ? "Usuário" : "Voluntário";
      return `${who}: ${redactPII(m.content ?? m.transcription ?? "(anexo)")}`;
    }).join("\n").slice(0, 8000);
    if (!lines) return { summary: "", technical: "" };

    const { chatCompletion } = await import("./ai-gateway.server");
    const raw = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `Você resume conversas de escuta acolhedora para um voluntário que poderá conversar novamente com a mesma pessoa. Responda em JSON com os campos "summary" (2-4 frases, tom acolhedor, sem dados sensíveis) e "technical" (bullet points curtos com temas, gatilhos e recomendações práticas, sem diagnósticos clínicos).` },
        { role: "user", content: lines },
      ],
      response_format: { type: "json_object" },
    });
    let parsed: { summary?: string; technical?: string } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { summary: raw }; }
    return { summary: parsed.summary ?? "", technical: parsed.technical ?? "" };
  });
