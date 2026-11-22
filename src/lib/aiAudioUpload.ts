import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SUPABASE_URL,
  DEFAULT_SUPABASE_PUBLISHABLE_KEY,
} from "@/integrations/supabase/public-config";

/** Uploads AI-chat audio directly to private Supabase Storage using resumable TUS chunks. */
export async function uploadAiChatAudio(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (sessionError || !userId)
    throw new Error("Sessão expirada. Entre novamente para enviar áudio.");

  const projectUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const apiKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const endpoint = `${projectUrl}/storage/v1/upload/resumable`;
  const headers: Record<string, string> = {
    "Tus-Resumable": "1.0.0",
    "Upload-Length": String(file.size),
    "Upload-Metadata": `bucketName ${btoa("ai-chat-audio")},objectName ${btoa(path)},contentType ${btoa(file.type || "audio/mpeg")},cacheControl ${btoa("3600")}`,
    apikey: apiKey,
    Authorization: `Bearer ${sessionData.session.access_token}`,
    "x-upsert": "false",
  };

  const uploadUrl = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const location = xhr.getResponseHeader("Location");
        if (location) resolve(new URL(location, endpoint).toString());
        else reject(new Error("Storage não retornou a URL resumível."));
      } else reject(new Error(`Falha ao iniciar upload (HTTP ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Falha de rede ao iniciar upload."));
    xhr.send();
  });

  let offset = 0;
  const chunkSize = 8 * 1024 * 1024;
  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PATCH", uploadUrl);
      xhr.setRequestHeader("Tus-Resumable", "1.0.0");
      xhr.setRequestHeader("Upload-Offset", String(offset));
      xhr.setRequestHeader("Content-Type", "application/offset+octet-stream");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable)
          onProgress?.(Math.min(99, Math.round(((offset + event.loaded) / file.size) * 100)));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const nextOffset = Number(xhr.getResponseHeader("Upload-Offset"));
          if (!Number.isFinite(nextOffset) || nextOffset <= offset) {
            reject(new Error("Offset de upload inválido."));
          } else {
            offset = nextOffset;
            resolve();
          }
        } else reject(new Error(`Falha no envio do bloco (HTTP ${xhr.status}).`));
      };
      xhr.onerror = () => reject(new Error("Conexão interrompida durante o upload."));
      xhr.send(chunk);
    });
  }

  onProgress?.(100);
  return path;
}
