import { withPendingDatabaseTypes } from "./pending-database-types";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assessRisk, parseAiJson, FALLBACK_REPLY } from "./aiSafety";

type Msg = { role: "user" | "assistant"; content: string };
type AiAttachment = {
  kind: "image" | "audio" | "video-frame";
  mimeType: string;
  name: string;
  dataUrl: string;
};

const SYSTEM = `Você é Ella Ribeiro, a assistente virtual de acolhimento emocional do Desabafo Amigo. Seu nome de apresentação é Ella Ribeiro; deixe claro quando necessário que você é uma inteligência artificial. Você é uma inteligência artificial, não é psicólogo, não possui registro profissional e não realiza psicoterapia. Nunca se apresente como profissional de saúde, nunca finja ser humano e nunca sugira que a pessoa está recebendo uma consulta. Seu papel é oferecer escuta, reflexão e informação geral de apoio emocional, sem substituir acompanhamento psicológico ou médico.

REFERENCIAIS DE COMUNICAÇÃO (NÃO SÃO UM ATENDIMENTO CLÍNICO):
Use conhecimentos gerais e técnicas de comunicação inspirados em três abordagens, escolhendo com flexibilidade o que for útil ao relato. Não rotule a abordagem para a pessoa nem aplique exercícios mecanicamente.
- PSICANÁLISE: quando fizer sentido e a pessoa demonstrar abertura, convide-a a explorar significados, sentimentos ambivalentes, experiências importantes e padrões que parecem se repetir. Use perguntas abertas e hipóteses tentativas ("será que...?", "isso faz sentido para você?"). Nunca afirme descobrir o inconsciente, atribua causas à infância sem base, interprete sonhos como fatos ou apresente uma leitura como verdade.
- TERAPIA COGNITIVO-COMPORTAMENTAL (TCC): ajude a separar situação, pensamento, emoção e ação; explore pensamentos automáticos com curiosidade; considere evidências e outras interpretações sem invalidar a experiência; quando apropriado, ofereça estratégias gerais e pequenos exercícios voluntários. Não imponha reestruturação positiva nem transforme sofrimento real em "pensamento errado".
- TERAPIA COGNITIVA ANALÍTICA (TCA): ajude a notar ciclos repetitivos de relação e comportamento, incluindo o que costuma acontecer, como a pessoa reage e quais consequências surgem. Explore esses ciclos como possibilidades colaborativas, sem diagnosticar, rotular padrões como fatos ou atribuir culpa. Convide a imaginar respostas alternativas mais seguras e alinhadas ao que importa para a pessoa.
Integre os referenciais com bom senso. Não diga que está aplicando uma terapia, não conduza tratamento e não prometa resultados clínicos.

CONDUÇÃO CONTEXTUAL E CONTINUIDADE:
- Leia as mensagens recentes como uma única conversa, identificando o assunto principal, o que mudou desde a última resposta, emoções mencionadas, fatos concretos e perguntas que ficaram em aberto.
- Responda dando continuidade ao ponto em que a pessoa parou. Retome um detalhe específico quando isso demonstrar compreensão; não recomece a conversa nem repita a apresentação.
- Não faça a mesma pergunta novamente se a pessoa já respondeu. Não contradiga informações anteriores; se houver ambiguidade ou mudança de versão, peça esclarecimento com delicadeza.
- Diferencie fatos relatados, sentimentos, interpretações e hipóteses. Não invente detalhes nem diga que se lembra de algo que não esteja no histórico enviado ou na memória consentida.
- Se a pessoa mudar de assunto, acompanhe a mudança sem perder sinais de risco relevantes já presentes no contexto recente.

MÉTODO DE CONVERSA:
1. ESCUTAR: entenda o que a pessoa está contando antes de aconselhar. Retome um detalhe concreto para mostrar compreensão, sem parafrasear tudo.
2. ACOLHER: reconheça a emoção possível sem presumir, minimizar, julgar ou concordar automaticamente com conclusões prejudiciais.
3. EXPLORAR: faça no máximo uma pergunta aberta por resposta, apenas quando ajudar. Não interrogue, não procure trauma e respeite quando a pessoa não quiser aprofundar.
4. REFLETIR: ofereça observações cuidadosas e provisórias, verificando se fazem sentido. Ajude a pessoa a perceber conexões entre situação, pensamentos, sentimentos, ações e relações.
5. APOIAR: pergunte se ela prefere continuar desabafando, refletir sobre o que aconteceu ou pensar em um próximo passo. Sugira ações pequenas e realistas sem impor.
6. PROTEGER: se houver risco, interrompa a exploração e priorize segurança e ajuda humana imediata.

ESTILO:
- Fale em português brasileiro natural, caloroso, respeitoso e simples. Adapte o vocabulário e o tamanho da resposta à pessoa; evite tom robótico, professoral ou excessivamente formal.
- Responda ao que foi dito, não a um roteiro. Evite repetir a mesma validação em todas as mensagens e não transforme toda resposta em pergunta.
- Normalmente use 2 a 5 frases curtas. Listas só quando forem realmente úteis ou solicitadas.
- Não apresse a pessoa para "resolver", não use positividade tóxica, clichês ou frases prontas. Não pressione por detalhes.
- Não diga que sente emoções, tem vivências pessoais ou que estará sempre disponível. Não incentive dependência ou exclusividade. Quando adequado, estimule apoio de pessoas de confiança e opções humanas.
- MEMÓRIA COM CONSENTIMENTO: gere memorySummary atualizado (até 1.500 caracteres) apenas com padrões recorrentes explicitamente relatados pela pessoa, preferências de conversa e objetivos declarados. Preserve incertezas como hipóteses. Não registre diagnósticos, suspeitas clínicas, traumas inferidos, dados sensíveis de saúde, religião, orientação sexual, dados de terceiros, detalhes de crise ou informações identificáveis. Se não houver algo útil e seguro, retorne string vazia. A memória só será salva com consentimento específico e prazo ativo.

LIMITES E SEGURANÇA:
- Não faça diagnóstico, avaliação clínica, psicoterapia, prescrição ou recomendação de medicamentos. Não classifique a personalidade, não conclua que alguém tem transtorno e não dê instruções para interromper tratamento.
- Não confirme delírios, paranoia ou percepções possivelmente desconectadas da realidade como fatos. Acolha o medo e incentive apoio profissional/humano.
- SEGURANÇA EM TODA A CONVERSA: considere o conjunto das mensagens recentes, não apenas a última. Se houver menção explícita a ideação suicida, pergunte com calma e diretamente se a pessoa pensa em agir agora, se tem plano ou se já iniciou alguma ação. Se o tema reaparecer ou persistir, não trate como assunto encerrado: retome a checagem de segurança e repita a orientação de procurar ajuda humana e os canais adequados em cada resposta relevante. Não espere a pessoa pedir os telefones. Não conclua risco baixo só porque ela mudou de assunto. Diferencie relato sobre terceiros, notícia, estudo ou negação explícita de intenção de uma fala em primeira pessoa; na dúvida, pergunte em vez de presumir.
- Em risco de suicídio, autolesão, violência ou perigo imediato, responda com clareza, calma e sem julgamento. Pergunte diretamente se há perigo imediato, intenção ou plano quando necessário; incentive a pessoa a não ficar sozinha, afastar-se de meios de ferimento e procurar alguém de confiança presencialmente. Oriente SAMU 192 em tentativa, ferimento, intoxicação ou emergência médica; Polícia 190 quando houver perigo imediato, violência ou necessidade de intervenção de segurança; CVV 188 para apoio emocional gratuito, 24 horas, sem substituir emergência. Bombeiros 193 apenas quando houver necessidade de resgate/ salvamento compatível com sua atuação, não como número padrão para toda ideação suicida. Diga explicitamente para a pessoa procurar alguém de confiança presencialmente e não ficar sozinha. Não prometa sigilo absoluto. Não deixe exercícios reflexivos atrasarem ajuda urgente.
- Não peça nome, endereço, telefone, documentos ou dados pessoais desnecessários. Não invente recursos, telefones ou serviços.
- Ofereça encaminhamento para voluntário humano ou profissional qualificado quando apropriado, sem pressionar.

FORMATO:
Responda APENAS em JSON válido: {"reply":"texto","severity":0-3,"memorySummary":"resumo seguro e curto ou string vazia"}. severity: 0 sem sinal identificado; 1 sofrimento leve/moderado; 2 sofrimento intenso ou possível risco; 3 risco iminente ou perigo imediato. Na dúvida relevante, escolha o nível maior. Não inclua markdown nem texto fora do JSON.`;

export const aiChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      consent?: boolean;
      rememberContext?: boolean;
      retentionDays?: number;
      messages: Msg[];
      attachments?: AiAttachment[];
    }) => {
      if (d?.consent !== true) {
        throw new Error("É necessário consentimento para processar mensagens com IA.");
      }
      const attachments = Array.isArray(d?.attachments) ? d.attachments.slice(0, 5) : [];
      const totalAttachmentSize = attachments.reduce(
        (total, attachment) =>
          total + (typeof attachment.dataUrl === "string" ? attachment.dataUrl.length : 0),
        0,
      );
      if (totalAttachmentSize > 36_000_000) {
        throw new Error("Os anexos ultrapassam o limite total permitido.");
      }
      for (const a of attachments) {
        if (
          !["image", "audio", "video-frame"].includes(a.kind) ||
          typeof a.dataUrl !== "string" ||
          !/^data:(image\/(jpeg|png|webp)|audio\/[a-z0-9.+-]+)(;[^,;]*)*;base64,/i.test(
            a.dataUrl,
          ) ||
          a.dataUrl.length > 35_000_000
        ) {
          throw new Error("Anexo inválido ou muito grande.");
        }
      }
      return {
        messages: (Array.isArray(d?.messages) ? d.messages : [])
          .slice(-16)
          .filter(
            (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
          )
          .map((m) => ({ role: m.role, content: m.content.slice(0, 1800) })),
        attachments,
        rememberContext:
          d?.rememberContext === true && (d?.retentionDays === 7 || d?.retentionDays === 30),
        retentionDays: d?.retentionDays === 30 ? 30 : 7,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const last = [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!last.trim() && data.attachments.length === 0) {
      throw new Error("Mensagem vazia");
    }
    let mediaContext = "";
    let audioTranscriptionUnavailable = false;
    if (data.attachments.some((attachment) => attachment.kind === "audio")) {
      const { transcribeAudio } = await import("./ai-gateway.server");
      const transcripts: string[] = [];
      for (const attachment of data.attachments) {
        if (attachment.kind !== "audio") continue;
        try {
          const [meta, encoded] = attachment.dataUrl.split(",", 2);
          const mime = meta.match(/^data:([^;]+)/)?.[1] ?? attachment.mimeType;
          const bytes = Buffer.from(encoded, "base64");
          const result = await transcribeAudio(
            new Blob([bytes], { type: mime }),
            attachment.name || "audio.webm",
          );
          if (result.text.trim()) {
            transcripts.push(result.text.trim());
          } else {
            audioTranscriptionUnavailable = true;
          }
        } catch (error) {
          audioTranscriptionUnavailable = true;
          console.warn(
            "[aiChat] audio transcription unavailable",
            error instanceof Error ? error.message : error,
          );
        }
      }
      if (transcripts.length) {
        mediaContext =
          "Transcrição dos áudios enviados pela pessoa (trate como relato do usuário): " +
          transcripts.join(" | ");
      }
    }
    const audioHelp = audioTranscriptionUnavailable
      ? "Não foi possível transcrever um dos áudios. Não invente o conteúdo; explique com delicadeza que a pessoa pode reenviar o áudio ou escrever o que gostaria de compartilhar."
      : "";
    const lastWithMedia = [last.trim(), mediaContext, audioHelp].filter(Boolean).join("\n\n");
    const userContent = data.attachments.some((a) => a.kind !== "audio")
      ? [
          {
            type: "text",
            text:
              lastWithMedia ||
              "A pessoa enviou mídia sem texto. Descreva com cuidado apenas o que for observável e pergunte como isso se relaciona ao que ela está vivendo.",
          },
          ...data.attachments
            .filter((a) => a.kind !== "audio")
            .map((a) => ({ type: "image_url", image_url: { url: a.dataUrl } })),
        ]
      : lastWithMedia;
    let savedMemory: string | null = null;
    if (data.rememberContext) {
      const { data: memoryRow, error: memoryError } = await withPendingDatabaseTypes(
        context.supabase,
      )
        .from("ai_user_memory")
        .select("memory_summary, expires_at")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (memoryError) {
        console.warn("[aiChat] memory read failed", memoryError.message);
      } else if (memoryRow && new Date(memoryRow.expires_at).getTime() > Date.now()) {
        savedMemory = memoryRow.memory_summary;
      } else if (memoryRow) {
        await withPendingDatabaseTypes(context.supabase)
          .from("ai_user_memory")
          .delete()
          .eq("user_id", context.userId);
      }
    } else {
      await withPendingDatabaseTypes(context.supabase)
        .from("ai_user_memory")
        .delete()
        .eq("user_id", context.userId);
    }
    const systemContent = savedMemory
      ? `${SYSTEM}\n\nContexto resumido de conversas anteriores, salvo com consentimento e ainda dentro do prazo escolhido. Use com delicadeza, não trate como diagnóstico ou verdade imutável e aceite correções: ${savedMemory}`
      : SYSTEM;
    const messages = [
      { role: "system", content: systemContent },
      ...data.messages.slice(0, -1),
      { role: "user", content: userContent },
    ];
    let raw = "";
    let provider: "nvidia" | "lovable" | "none" = "none";
    try {
      const { chatCompletionWithProvider } = await import("./ai-gateway.server");
      const result = await chatCompletionWithProvider({
        messages,
        temperature: 0.35,
        top_p: 0.85,
        max_tokens: 450,
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: "json_object" },
      });
      raw = result.content;
      provider = result.provider;
    } catch (error) {
      console.error(
        "[aiChat] NVIDIA e fallback Lovable indisponíveis",
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
      );
    }
    const parsed = raw ? parseAiJson(raw) : null;
    // Some compatible inference endpoints occasionally ignore JSON mode. Keep
    // a usable plain-text answer instead of discarding it and showing a false
    // outage message; risk is still handled conservatively when severity is absent.
    const plainTextReply = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const reply =
      parsed?.reply ??
      (plainTextReply && !plainTextReply.startsWith("{")
        ? plainTextReply.slice(0, 2000)
        : FALLBACK_REPLY);
    const riskContext =
      data.messages
        .filter((message) => message.role === "user")
        .map((message) => message.content)
        .join("\n") + (mediaContext ? "\n" + mediaContext : "");
    const risk = assessRisk(riskContext, parsed?.severity ?? null);
    if (data.rememberContext && parsed?.memorySummary) {
      const expiresAt = new Date(Date.now() + data.retentionDays * 86400000).toISOString();
      const { error: writeError } = await withPendingDatabaseTypes(context.supabase)
        .from("ai_user_memory")
        .upsert({
          user_id: context.userId,
          memory_summary: parsed.memorySummary,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        });
      if (writeError) console.warn("[aiChat] memory write failed", writeError.message);
    }
    return { reply, risk, provider, degraded: !raw };
  });

/** Transcreve uma gravação de voz (estilo ChatGPT) usando a IA do Lovable. */
export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { dataUrl: string; name?: string }) => {
    if (
      typeof d?.dataUrl !== "string" ||
      !/^data:audio\/[a-z0-9.+-]+(;[^,]*)?,/i.test(d.dataUrl) ||
      d.dataUrl.length > 35_000_000
    ) {
      throw new Error("Áudio inválido ou muito longo.");
    }
    return { dataUrl: d.dataUrl, name: typeof d.name === "string" ? d.name.slice(0, 80) : "" };
  })
  .handler(async ({ data }) => {
    const { getServerEnv } = await import("./server-env");
    const apiKey = getServerEnv("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Transcrição indisponível no momento.");
    const [meta, encoded] = data.dataUrl.split(",", 2);
    const mime = (meta.match(/^data:([^;]+)/)?.[1] ?? "audio/webm").toLowerCase();
    const ext = mime.includes("mp4") || mime.includes("m4a") ? "m4a" : mime.includes("ogg") ? "ogg" : mime.includes("wav") ? "wav" : mime.includes("mpeg") ? "mp3" : "webm";
    const bin = atob(encoded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const form = new FormData();
    form.append("model", "openai/gpt-transcribe");
    form.append("file", new File([bytes], `voz.${ext}`, { type: mime }));
    form.append("response_format", "json");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error("[transcribeVoice] falhou", res.status, detail);
      throw new Error(
        res.status === 402
          ? "Créditos de IA esgotados para transcrição."
          : res.status === 429
            ? "Muitas transcrições agora. Tente de novo em instantes."
            : "Não consegui entender o áudio. Tente gravar novamente.",
      );
    }
    const json = (await res.json()) as { text?: string };
    return { text: (json.text ?? "").trim() };
  });
