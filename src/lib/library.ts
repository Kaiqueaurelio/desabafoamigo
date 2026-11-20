import { supabase } from "@/integrations/supabase/client";

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

export async function uploadLibraryFile(file: File, kind: "audio" | "image", onProgress?: (percent: number) => void): Promise<string> {
  const ext = file.name.split(".").pop() ?? (kind === "audio" ? "mp3" : "jpg");
  const path = `${kind}/${crypto.randomUUID()}.${ext}`;
  // Use TUS resumable protocol for reliability and real upload progress.
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) throw new Error("Sessão expirada. Entre novamente para enviar arquivos.");
  const projectUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const projectId = projectUrl.match(/^https?:\/\/([^.]+)/)?.[1];
  if (!projectId) throw new Error("Configuração do Supabase inválida para upload resumível.");
  const endpoint = `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
  const headers = { "Tus-Resumable": "1.0.0", "Upload-Length": String(file.size), "Upload-Metadata": `bucketName ${btoa(BUCKET)},objectName ${btoa(path)},contentType ${btoa(file.type || (kind === "audio" ? "audio/mpeg" : "image/jpeg"))},cacheControl ${btoa("3600")}`, "apikey": (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ""), "Authorization": `Bearer ${sessionData.session.access_token}` };
  const uploadUrl = await new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open("POST", endpoint);
    Object.entries(headers).forEach(([k,v])=>{ if(v) xhr.setRequestHeader(k,v); });
    xhr.setRequestHeader("x-upsert","false");
    xhr.onload=()=>{ if(xhr.status>=200 && xhr.status<300){ const loc=xhr.getResponseHeader("Location"); if(!loc) return reject(new Error("Storage não retornou URL de upload.")); resolve(new URL(loc,endpoint).toString()); } reject(new Error(`Falha ao iniciar upload (HTTP ${xhr.status}): ${xhr.responseText || xhr.statusText}`)); };
    xhr.onerror=()=>reject(new Error("Falha de rede ao iniciar upload.")); xhr.send();
  });
  let offset=0; const chunkSize=6*1024*1024;
  while(offset<file.size){ const chunk=file.slice(offset,Math.min(offset+chunkSize,file.size));
    await new Promise<void>((resolve,reject)=>{ const xhr=new XMLHttpRequest(); xhr.open("PATCH",uploadUrl); xhr.setRequestHeader("Tus-Resumable","1.0.0"); xhr.setRequestHeader("Upload-Offset",String(offset)); xhr.setRequestHeader("Content-Type","application/offset+octet-stream"); xhr.upload.onprogress=(e)=>{if(e.lengthComputable) onProgress?.(Math.min(99,Math.round((offset+e.loaded)/file.size*100)));}; xhr.onload=()=>{ if(xhr.status>=200&&xhr.status<300){ const next=Number(xhr.getResponseHeader("Upload-Offset")); if(!Number.isFinite(next)||next<=offset) return reject(new Error("Resposta inválida do upload resumível.")); offset=next; resolve(); } else reject(new Error(`Falha no envio do trecho (HTTP ${xhr.status}): ${xhr.responseText||xhr.statusText}`));}; xhr.onerror=()=>reject(new Error("Conexão interrompida durante upload.")); xhr.send(chunk); });
  }
  onProgress?.(100); return path;
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
