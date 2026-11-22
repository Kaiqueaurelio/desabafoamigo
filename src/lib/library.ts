import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/public-config";
const BUCKET = "library-media";
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;
const MAX_AUDIO_SIZE = 50 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
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

function xhrRequest<T>(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: Blob,
): Promise<{ status: number; headers: Headers; responseText: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = 120_000;
    Object.entries(headers).forEach(([key, value]) => {
      if (value) xhr.setRequestHeader(key, value);
    });
    xhr.onload = () => {
      const responseHeaders = new Headers();
      xhr.getAllResponseHeaders().trim().split(/[\r\n]+/).forEach((line) => {
        const index = line.indexOf(":");
        if (index > 0) responseHeaders.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
      });
      resolve({ status: xhr.status, headers: responseHeaders, responseText: xhr.responseText || "" });
    };
    xhr.onerror = () => reject(new Error("Falha de conexão com o armazenamento."));
    xhr.ontimeout = () => reject(new Error("O armazenamento demorou demais para responder. Tente novamente."));
    xhr.onabort = () => reject(new Error("Envio cancelado."));
    xhr.send(body);
  });
}

function storageError(status: number, detail = ""): Error {
  const suffix = detail.trim().slice(0, 180);
  if (status === 413) return new Error("O armazenamento recusou o arquivo por tamanho. Verifique o limite do bucket.");
  if (status === 401 || status === 403) return new Error("Sem permissão para enviar. Atualize sua sessão e tente novamente.");
  if (status === 404) return new Error("Bucket de armazenamento não encontrado ou endpoint TUS indisponível.");
  return new Error(`Falha no upload (HTTP ${status})${suffix ? `: ${suffix}` : ""}.`);
}

export async function uploadLibraryFile(
  file: File,
  kind: "audio" | "image",
  onProgress?: (percent: number) => void
): Promise<string> {
  const maxSize = kind === "audio" ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    throw new Error(kind === "audio" ? "O áudio excede o limite de 50 MB." : "A imagem excede o limite de 5 MB.");
  }
  if (file.size === 0) throw new Error("O arquivo está vazio.");
  const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || (kind === "audio" ? "mp3" : "jpg");
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
  const contentType = file.type || (kind === "audio" ? "audio/mpeg" : "image/jpeg");
  const authHeaders = {
    apikey: apiKey,
    Authorization: `Bearer ${sessionData.session.access_token}`,
    "Tus-Resumable": "1.0.0",
  };
  const endpoint = `${projectUrl}/storage/v1/upload/resumable`;

  // TUS é obrigatório para arquivos maiores que 6 MB: não tenta o upload
  // multipart padrão, que pode falhar com arquivos grandes e esconder o erro real.
  let uploadUrl: string;
  try {
    const init = await xhrRequest("POST", endpoint, {
      ...authHeaders,
      "Upload-Length": String(file.size),
      "Upload-Metadata": `bucketName ${btoa(BUCKET)},objectName ${btoa(path)},contentType ${btoa(contentType)},cacheControl ${btoa("3600")}`,
      "x-upsert": "false",
    });
    if (init.status < 200 || init.status >= 300) throw storageError(init.status, init.responseText);
    const location = init.headers.get("location");
    if (!location) throw new Error("Storage não retornou o endereço de upload TUS.");
    uploadUrl = new URL(location, endpoint).toString();
  } catch (tusInitError) {
    if (file.size > TUS_CHUNK_SIZE) {
      throw new Error(tusInitError instanceof Error
        ? `Upload resumível indisponível para arquivo grande: ${tusInitError.message}`
        : "Upload resumível indisponível para arquivo grande. Tente novamente.");
    }
    // Fallback multipart apenas para arquivos pequenos.
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });
    if (error) throw new Error(`Falha no upload: ${error.message}`);
    onProgress?.(100);
    return path;
  }

  let offset = 0;
  while (offset < file.size) {
    const chunk = file.slice(offset, Math.min(offset + TUS_CHUNK_SIZE, file.size));
    let attempts = 0;
    let completed = false;
    while (!completed && attempts < 3) {
      attempts++;
      try {
        const response = await xhrRequest("PATCH", uploadUrl, {
          ...authHeaders,
          "Upload-Offset": String(offset),
          "Content-Type": "application/offset+octet-stream",
        }, chunk);
        if (response.status >= 200 && response.status < 300) {
          const next = Number(response.headers.get("upload-offset"));
          if (!Number.isFinite(next) || next <= offset) throw new Error("Resposta de offset inválida do Storage.");
          offset = next;
          completed = true;
        } else {
          throw storageError(response.status, response.responseText);
        }
      } catch (patchError) {
        if (attempts >= 3) throw new Error(patchError instanceof Error ? patchError.message : "Falha ao enviar parte do arquivo.");
        // Se o servidor recebeu o chunk, mas a resposta se perdeu, recupera o offset
        // via HEAD para não reenviar bytes nem corromper o arquivo.
        try {
          const head = await xhrRequest("HEAD", uploadUrl, authHeaders);
          const serverOffset = Number(head.headers.get("upload-offset"));
          if (head.status >= 200 && head.status < 300 && Number.isFinite(serverOffset) && serverOffset > offset) {
            offset = serverOffset;
            completed = true;
          }
        } catch {
          /* retry do mesmo offset */
        }
      }
    }
    onProgress?.(Math.min(99, Math.round((offset / file.size) * 100)));
  }
  onProgress?.(100);
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
