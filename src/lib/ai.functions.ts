import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const transcribeMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messageId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msg, error } = await supabase
      .from("messages")
      .select("id, conversation_id, transcription, attachment_id")
      .eq("id", data.messageId)
      .maybeSingle();
    if (error || !msg?.attachment_id) throw new Error("Mensagem inválida");
    if (msg.transcription) return { text: msg.transcription };

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
    const text = await transcribeAudio(blob, att.original_name ?? "audio.webm");

    await supabase.from("messages").update({ transcription: text }).eq("id", msg.id);
    return { text };
  });

export const translateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messageId: string; targetLang: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: msg } = await supabase
      .from("messages")
      .select("id, content, transcription, translations")
      .eq("id", data.messageId).maybeSingle();
    if (!msg) throw new Error("Mensagem inválida");
    const source = msg.content ?? msg.transcription ?? "";
    if (!source.trim()) throw new Error("Nada para traduzir");

    const cache = (msg.translations as Record<string, string>) ?? {};
    if (cache[data.targetLang]) return { text: cache[data.targetLang] };

    const { chatCompletion } = await import("./ai-gateway.server");
    const translated = await chatCompletion({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `Você é um tradutor profissional. Traduza fielmente o texto do usuário para o idioma "${data.targetLang}". Responda somente com a tradução, sem comentários.` },
        { role: "user", content: source },
      ],
    });
    cache[data.targetLang] = translated;
    await supabase.from("messages").update({ translations: cache }).eq("id", msg.id);
    return { text: translated };
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
    const lines = (msgs ?? []).map((m) => {
      const who = m.sender_id === conv.user_id ? "Usuário" : "Voluntário";
      return `${who}: ${m.content ?? m.transcription ?? "(anexo)"}`;
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
