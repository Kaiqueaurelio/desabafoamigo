import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Kind = "audio" | "image" | "phrase";

const AUDIO_CATS = ["asmr", "meditacao", "natureza", "sono", "respiracao"];
const IMAGE_CATS = ["acolhimento", "natureza", "abstrato"];
const PHRASE_CATS = ["acolhimento", "coragem", "autocuidado", "motivacao", "respiracao", "emocoes"];

export const autofillLibraryMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: { kind: Kind; storagePath?: string; filename?: string; phraseText?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { chatCompletion, transcribeAudio } = await import("./ai-gateway.server");

    const cats =
      data.kind === "audio" ? AUDIO_CATS : data.kind === "image" ? IMAGE_CATS : PHRASE_CATS;

    // ---------- PHRASE ----------
    if (data.kind === "phrase") {
      const text = (data.phraseText ?? "").trim().slice(0, 1000);
      if (!text) throw new Error("Sem texto para analisar");
      const raw = await chatCompletion({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Classifique a frase de acolhimento. Escolha UMA categoria entre: ${cats.join(", ")}. Sugira um autor (deixe "" se não souber). Responda APENAS JSON: {"category":"...","author":"","description":""}. Português do Brasil.`,
          },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
      });
      const j = safeJson(raw);
      return {
        title: "",
        category: pickCat(j.category, cats),
        description: (j.description ?? "").slice(0, 300),
        author: (j.author ?? "").slice(0, 80),
      };
    }

    // ---------- MEDIA (audio/image) ----------
    if (!data.storagePath) throw new Error("Arquivo não enviado");
    const { data: signed } = await supabase.storage
      .from("library-media")
      .createSignedUrl(data.storagePath, 300);
    if (!signed?.signedUrl) throw new Error("Falha ao acessar arquivo");

    const filenameHint = (data.filename ?? data.storagePath.split("/").pop() ?? "").slice(0, 120);

    if (data.kind === "audio") {
      let transcript = "";
      try {
        const res = await fetch(signed.signedUrl);
        const blob = await res.blob();
        const tr = await transcribeAudio(blob, filenameHint || "audio.mp3");
        transcript = (tr.text ?? "").slice(0, 2000);
      } catch {
        // segue sem transcript
      }
      const raw = await chatCompletion({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você catalogará um áudio para uma "sala de relaxamento" (ASMR, meditação, natureza, sono, respiração). Categorias permitidas: ${cats.join(", ")}. Responda APENAS JSON: {"title":"até 60 chars","category":"...","description":"1-2 frases acolhedoras, até 220 chars"}. Português do Brasil, sem clichês.`,
          },
          {
            role: "user",
            content: `Nome do arquivo: ${filenameHint || "(sem nome)"}\nTrecho transcrito (se houver): ${transcript || "(sem áudio compreensível)"}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const j = safeJson(raw);
      return {
        title: (j.title ?? guessTitleFromFilename(filenameHint)).slice(0, 80),
        category: pickCat(j.category, cats),
        description: (j.description ?? "").slice(0, 300),
        author: "",
      };
    }

    // image
    const res = await fetch(signed.signedUrl);
    const buf = new Uint8Array(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    // limit ~4MB to keep request light
    const b64 = bufferToBase64(buf.subarray(0, 4_000_000));
    const dataUrl = `data:${mime};base64,${b64}`;

    const raw = await chatCompletion({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Você catalogará uma imagem para uma "sala de relaxamento" que acolhe pessoas em sofrimento. Categorias permitidas: ${cats.join(", ")}. Responda APENAS JSON: {"title":"até 60 chars","category":"...","description":"1-2 frases acolhedoras, até 220 chars"}. Português do Brasil.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Descreva e classifique. Nome do arquivo: ${filenameHint || "(sem nome)"}.` },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });
    const j = safeJson(raw);
    return {
      title: (j.title ?? guessTitleFromFilename(filenameHint)).slice(0, 80),
      category: pickCat(j.category, cats),
      description: (j.description ?? "").slice(0, 300),
      author: "",
    };
  });

function safeJson(raw: string): Record<string, string> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function pickCat(v: unknown, cats: string[]): string {
  const s = String(v ?? "").toLowerCase().trim();
  return cats.includes(s) ? s : cats[0];
}

function guessTitleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function bufferToBase64(bytes: Uint8Array): string {
  // Worker/node runtime: Buffer available via nodejs_compat
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const B: any = (globalThis as any).Buffer;
  if (B) return B.from(bytes).toString("base64");
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
