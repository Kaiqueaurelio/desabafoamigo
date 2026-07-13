import { supabase } from "@/integrations/supabase/client";

const BUCKET = "library-media";

/**
 * Retorna URL assinada (1h) para um caminho no bucket privado library-media.
 * Se o valor recebido já é uma URL http(s), devolve como está — permite
 * combinar arquivos hospedados no bucket com URLs externas curadas.
 */
export async function libraryMediaUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUrl, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadLibraryFile(file: File, kind: "audio" | "image"): Promise<string> {
  const ext = file.name.split(".").pop() ?? (kind === "audio" ? "mp3" : "jpg");
  const path = `${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeLibraryFile(path: string) {
  if (!path || /^https?:\/\//i.test(path)) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

export const AUDIO_CATEGORIES = [
  { id: "asmr", label: "ASMR" },
  { id: "meditacao", label: "Meditação guiada" },
  { id: "natureza", label: "Sons da natureza" },
  { id: "sono", label: "Para dormir" },
  { id: "respiracao", label: "Respiração" },
] as const;

export const PHRASE_CATEGORIES = [
  { id: "acolhimento", label: "Acolhimento" },
  { id: "coragem", label: "Coragem" },
  { id: "autocuidado", label: "Autocuidado" },
  { id: "motivacao", label: "Motivação" },
  { id: "respiracao", label: "Respiração" },
  { id: "emocoes", label: "Emoções" },
] as const;

export const IMAGE_CATEGORIES = [
  { id: "acolhimento", label: "Acolhimento" },
  { id: "natureza", label: "Natureza" },
  { id: "abstrato", label: "Abstrato" },
] as const;
