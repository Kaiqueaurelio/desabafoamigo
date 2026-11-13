import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectRisk } from "./riskWords";

export type Segment = { start: number; end: number; text: string };

// ===== Onda 2: Classificação de risco por IA =====
export const classifyRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => d)
  .handler(async ({ data }) => {
    const text = (data.text ?? "").slice(0, 2000).trim();
    if (!text) return { severity: 0, reason: "", suggestion: "" };

    const localRisk = detectRisk(text);
    try {
      const { chatCompletion } = await import("./ai-gateway.server");
      const raw = await chatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um classificador de risco emocional para mensagens em português. Retorne APENAS JSON: {"severity": 0-3, "reason": "curta", "suggestion": "resposta acolhedora curta ao usuário se severity>=2"}. Níveis: 0 = sem risco, 1 = sofrimento leve, 2 = sofrimento grave (menções indiretas de morte, desesperança forte), 3 = risco iminente (ideação/plano suicida, autolesão iminente). Seja conservador — na dúvida entre 1 e 2, escolha 2.`,
          },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      });
      const j = JSON.parse(raw) as { severity?: unknown; reason?: unknown; suggestion?: unknown };
      const severity = Number(j.severity);
      if (!Number.isFinite(severity) || severity < 0 || severity > 3) throw new Error("Resposta de risco inválida");
      return {
        severity: Math.max(localRisk ? 2 : 0, Math.min(3, Math.round(severity))),
        reason: typeof j.reason === "string" ? j.reason.slice(0, 200) : "",
        suggestion: typeof j.suggestion === "string" ? j.suggestion.slice(0, 500) : "",
      };
    } catch (error) {
      console.error("[classifyRisk] avaliação indisponível; aplicando contingência segura", error);
      return {
        severity: localRisk ? 3 : 2,
        reason: "Avaliação automática indisponível; encaminhar para acolhimento humano.",
        suggestion: "Não estou conseguindo avaliar isso com segurança agora. Posso te conectar a uma pessoa voluntária para conversar?",
      };
    }
  });

// ===== Onda 2: Sugestões de resposta empáticas =====
export const suggestReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conv } = await supabase
      .from("conversations")
      .select("id, user_id, volunteer_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conv) throw new Error("Conversa inválida");
    if (conv.volunteer_id !== userId) throw new Error("Somente o voluntário desta conversa");

    const { data: msgs } = await supabase
      .from("messages")
      .select("sender_id, content, transcription, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: false })
      .limit(12);
    const ordered = (msgs ?? []).reverse();
    const lines = ordered
      .map((m) => `${m.sender_id === conv.user_id ? "Pessoa" : "Voluntário"}: ${m.content ?? m.transcription ?? "(anexo)"}`)
      .join("\n")
      .slice(0, 4000);
    if (!lines) return { suggestions: [] as string[] };

    // v2: contexto emocional — humor recente e temas do diário do usuário
    let mood_ctx = "";
    if (conv.user_id) {
      const [{ data: moods }, { data: journal }] = await Promise.all([
        supabase
          .from("mood_entries")
          .select("mood, note, created_at")
          .eq("user_id", conv.user_id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("user_summaries")
          .select("summary, technical_details, created_at")
          .eq("user_id", conv.user_id)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      const moodLine = (moods ?? [])
        .map((m) => `humor ${m.mood}/5${m.note ? ` (${m.note.slice(0, 60)})` : ""}`)
        .join(", ");
      const prevSummary = journal?.[0]?.summary?.slice(0, 400) ?? "";
      if (moodLine || prevSummary) {
        mood_ctx = `Contexto anterior desta pessoa (para você entender melhor, NÃO cite explicitamente): ${moodLine}${prevSummary ? `. Resumo de conversa anterior: ${prevSummary}` : ""}.`;
      }
    }

    const { chatCompletion } = await import("./ai-gateway.server");
    const raw = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `Você ajuda um(a) voluntário(a) de escuta acolhedora a responder. Gere 3 sugestões CURTAS (máx 220 caracteres cada), empáticas, sem julgar, sem dar diagnóstico, sem prometer resultado. Use validação emocional e perguntas abertas. Responda APENAS JSON: {"suggestions":["...","...","..."]}. Português do Brasil.${mood_ctx ? `\n${mood_ctx}` : ""}`,
        },
        { role: "user", content: lines },
      ],
      response_format: { type: "json_object" },
    });
    try {
      const j = JSON.parse(raw) as { suggestions?: string[] };
      const list = Array.isArray(j.suggestions) ? j.suggestions.filter((s) => typeof s === "string").slice(0, 3) : [];
      return { suggestions: list };
    } catch {
      return { suggestions: [] as string[] };
    }
  });


// ===== Onda 2: Chatbot de triagem antes da fila =====
type TriageTurn = { role: "user" | "assistant"; content: string };
export const triageStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { history: TriageTurn[] }) => ({
    history: (Array.isArray(d?.history) ? d.history : [])
      .slice(-10)
      .filter((h) => (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
      .map((h) => ({ role: h.role, content: h.content.slice(0, 1000) })),
  }))
  .handler(async ({ data }) => {
    const history = data.history;
    const userText = history.filter((h) => h.role === "user").map((h) => h.content).join("\n");
    const localRisk = detectRisk(userText);
    const safeFallback = {
      reply: localRisk
        ? "Quero levar o que você contou a sério. Vou priorizar o contato com uma pessoa voluntária. Se houver perigo imediato, procure alguém de confiança que esteja perto e ligue 192 (SAMU). O CVV atende gratuitamente pelo 188."
        : "Estou com uma dificuldade técnica para concluir a triagem. Para não deixar você sem apoio, podemos seguir para o acolhimento humano.",
      done: true,
      topic: localRisk
        ? "A pessoa demonstrou sofrimento intenso e precisa de acolhimento humano prioritário."
        : "A triagem automática ficou indisponível; oferecer acolhimento humano.",
      urgency: localRisk ? "high" as const : "medium" as const,
    };

    try {
      const { chatCompletion } = await import("./ai-gateway.server");
      const raw = await chatCompletion({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente de triagem acolhedora do Desabafo Amigo. Objetivo: em NO MÁXIMO 4 turnos, entender o que a pessoa gostaria de conversar e o nível de urgência, para preparar a fila.
Regras:
- Tom quente, curto, sem clichês, sem dar diagnóstico ou conselho clínico.
- Uma pergunta por vez. Nunca peça dados pessoais (nome, cidade, telefone, e-mail).
- Se detectar risco alto (ideação suicida, autolesão iminente), NÃO faça mais perguntas: peça permissão para conectar já e sugira o CVV 188 e SAMU 192.
- Ao decidir que já entendeu, defina done=true e escreva um "topic" resumido (máx 200 caracteres, 1ª pessoa) que aparecerá na fila para o(a) voluntário(a).
Responda SEMPRE JSON: {"reply":"...","done":boolean,"topic":"...opcional...","urgency":"low|medium|high"}.`,
          },
          ...history.map((h) => ({ role: h.role, content: h.content })),
        ],
        response_format: { type: "json_object" },
      });
      const j = JSON.parse(raw) as { reply?: unknown; done?: unknown; topic?: unknown; urgency?: unknown };
      if (typeof j.reply !== "string" || !j.reply.trim()) throw new Error("Resposta de triagem inválida");
      const urgency = j.urgency === "high" || j.urgency === "medium" ? j.urgency : "low";
      return {
        reply: j.reply.slice(0, 600),
        done: Boolean(j.done) || localRisk,
        topic: (typeof j.topic === "string" ? j.topic : safeFallback.topic).slice(0, 200),
        urgency: localRisk ? "high" as const : urgency,
      };
    } catch (error) {
      console.error("[triageStep] triagem indisponível; encaminhando para acolhimento humano", error);
      return safeFallback;
    }
  });

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
