import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://yczvbygxizzjzqvufocy.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_uIqilehi8SJK2KRwqTbDDA_FaqBs63Z";

const adminEmail = process.env.ADMIN_EMAIL || process.argv[2];
const adminPassword = process.env.ADMIN_PASSWORD || process.argv[3];

if (!adminEmail || !adminPassword) {
  console.error(
    "Uso: ADMIN_EMAIL=email ADMIN_PASSWORD=senha npx tsx scripts/upload-asmr.ts",
  );
  process.exit(1);
}

const filePath = resolve(process.cwd(), "asmr_payKGjau.mp3");
if (!existsSync(filePath)) {
  console.error(`Arquivo não encontrado em: ${filePath}`);
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log(`Conectando como ${adminEmail}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (authError || !authData.session) {
    console.error("Erro ao autenticar administrador:", authError?.message);
    process.exit(1);
  }

  const fileBuffer = readFileSync(filePath);
  const storagePath = `audio/${randomUUID()}.mp3`;

  console.log(
    `Fazendo upload de ${storagePath} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB)...`,
  );
  const { error: uploadError } = await supabase.storage.from("library-media").upload(
    storagePath,
    fileBuffer,
    {
      contentType: "audio/mpeg",
      cacheControl: "3600",
      upsert: false,
    },
  );

  if (uploadError) {
    console.error("Erro no upload do storage:", uploadError.message);
    process.exit(1);
  }

  console.log("Registrando áudio na tabela library_audios...");
  const { data: row, error: insertError } = await supabase
    .from("library_audios")
    .insert({
      title: "ASMR para Crises e Ansiedade",
      description:
        "Áudio suave e acolhedor para acalmar pensamentos e desacelerar em momentos de crise.",
      category: "asmr",
      audio_url: storagePath,
      duration_seconds: 564,
      published: true,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Erro ao inserir registro:", insertError.message);
    const { error: cleanupError } = await supabase.storage
      .from("library-media")
      .remove([storagePath]);
    if (cleanupError) {
      console.error("Falha ao limpar arquivo enviado:", cleanupError.message);
    }
    process.exit(1);
  }

  console.log("Sucesso! Áudio cadastrado:");
  console.log(`- ID: ${row.id}`);
  console.log(`- Título: ${row.title}`);
  console.log("- Duração: 9m24s (564s)");
  console.log("- Status: Publicado e visível em /relaxar");
  await supabase.auth.signOut();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
