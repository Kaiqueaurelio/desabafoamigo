import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/public-config";
const BUCKET = "library-media";
/**
 * Retorna URL assinada (1h) para um caminho no bucket privado library-media.
 * Se o valor recebido já é uma URL http(s), devolve como está — permite
 * combinar arquivos hospedados no bucket com URLs externas curadas.
 */
export async function libraryMediaUrl(
  pathOrUrl: string | null | undefined,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pathOrUrl, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadLibraryFile(
  file: File,
  kind: "audio" | "image",
  onProgress?: (percent: number) => void
): Promise<string> {
  const ext = file.name.split(".").pop() ?? (kind === "audio" ? "mp3" : "jpg");
  const path = `${kind}/${crypto.randomUUID()}.${ext}`;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw new Error("Sessão expirada. Entre novamente para enviar arquivos.");
  }

  const projectUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const apiKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  // Tenta upload resumível via TUS (ideal para arquivos grandes e progresso real).
  try {
    const endpoint = `${projectUrl}/storage/v1/upload/resumable`;
    const headers: Record<string, string> = {
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(file.size),
      "Upload-Metadata": `bucketName ${btoa(BUCKET)},objectName ${btoa(path)},contentType ${btoa(
        file.type || (kind === "audio" ? "audio/mpeg" : "image/jpeg")
      )},cacheControl ${btoa("3600")}`,
      apikey: apiKey,
      Authorization: `Bearer ${sessionData.session.access_token}`,
      "x-upsert": "false",
    };

    const uploadUrl = await new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      Object.entries(headers).forEach(([k, v]) => {
        if (v) xhr.setRequestHeader(k, v);
      });
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const loc = xhr.getResponseHeader("Location");
          if (!loc) return reject(new Error("Storage não retornou Location"));
          resolve(new URL(loc, endpoint).toString());
        } else {
          reject(new Error(`TUS init failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Falha de rede no init TUS"));
      xhr.send();
    });

    let offset = 0;
    const chunkSize = 6 * 1024 * 1024; // pedaços de 6 MB

    while (offset < file.size) {
      const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PATCH", uploadUrl);
        xhr.setRequestHeader("Tus-Resumable", "1.0.0");
        xhr.setRequestHeader("Upload-Offset", String(offset));
        xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress?.(Math.min(99, Math.round(((offset + e.loaded) / file.size) * 100)));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const next = Number(xhr.getResponseHeader("Upload-Offset"));
            if (!Number.isFinite(next) || next <= offset) {
              return reject(new Error("Resposta de offset inválida"));
            }
            offset = next;
            resolve();
          } else {
            reject(new Error(`Erro no chunk TUS (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("Conexão interrompida"));
        xhr.send(chunk);
      });
    }

    onProgress?.(100);
    return path;
  } catch (tusErr) {
    // Fallback: envio direto pelo cliente do Supabase com tratamento de erro.
    console.warn("Upload TUS falhou, usando upload padrão:", tusErr);
    onProgress?.(50);
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      throw new Error(`Falha no upload: ${error.message}`);
    }
    onProgress?.(100);
    return path;
  }
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
