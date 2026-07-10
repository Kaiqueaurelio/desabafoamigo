# Plano — Desabafa Amigo → Teleorientação por mensagem

Transformação completa para uma experiência tipo telemedicina, focada em chat (não vídeo). Reaproveita o cadastro atual de voluntários/psicólogos como "profissionais" e mantém aprovação pelo admin.

## Mudanças no banco (uma migração)

- `profiles` — dados do paciente (display_name, birth_year opcional, notas gerais). Criado automaticamente no signup.
- `volunteers` — adicionar `specialty`, `bio`, `photo_url`, `available_slots` (JSON de horários semanais).
- `appointments` (nova) — `patient_id`, `professional_id`, `scheduled_at`, `duration_min`, `topic`, `status` (`scheduled | in_progress | completed | cancelled`), `conversation_id`.
- `conversations` — remover a lógica efêmera (drop do trigger `purge_messages_on_end`). Passa a persistir; ligada a `appointment_id`.
- `messages` — adicionar `attachment_id` opcional.
- `attachments` (nova) — `conversation_id`, `sender_id`, `storage_path`, `mime_type`, `size_bytes`, `kind` (`pdf | image | audio`).
- Bucket `consultation-files` (privado) com RLS por participante.
- Fila anônima (`queue`) removida — agendamento substitui.

## Novas rotas

Área paciente (`_authenticated/`):
- `/inicio` — dashboard: próximas consultas, botão "Nova consulta", últimos profissionais.
- `/profissionais` — grid de cards (foto, especialidade, bio, próximos horários).
- `/agendar/$professionalId` — escolher slot + descrever motivo.
- `/consultas` — histórico de consultas com status e resumo.
- `/consulta/$id` — tela dividida: dados da consulta + chat + painel de anexos.

Área profissional (`_authenticated/pro/`):
- `/pro` — agenda do dia, consultas pendentes/ativas.
- `/pro/consulta/$id` — mesma tela de chat com notas privadas.
- `/pro/perfil` — editar bio, foto, especialidade, horários disponíveis.

Área admin: mantém `/admin` (aprovação de profissionais + métricas).

Público: `/` (landing telemedicina), `/auth` (login/cadastro paciente), `/pro/cadastro`.

## Interface (shadcn/ui)

- Layout com sidebar colapsável (`Sidebar`) para áreas logadas.
- Cards de profissional: Avatar, badge de especialidade, botão "Agendar".
- Chat: mesmo padrão atual, mas com dropzone de anexos, player de áudio inline, preview de PDF/imagem.
- Agendamento: `Calendar` + slots em botões.
- Emergência: banner discreto sempre visível com CVV 188 (mantido).

## Anexos

- Upload direto do cliente para Storage (bucket privado) via signed URL.
- Servidor gera URL assinada de leitura por 10 min quando participante abre o anexo.
- Limites: PDF 10MB, imagem 5MB, áudio 5min/10MB.
- Áudio gravado no navegador (`MediaRecorder`, webm/opus).

## Fluxo do usuário

Paciente: cadastro → dashboard → escolhe profissional → agenda slot → recebe consulta em "próximas" → no horário abre a consulta e conversa (assíncrono, pode enviar anexos) → profissional finaliza → consulta vai para histórico.

Profissional: cadastro → aguarda aprovação admin → define horários/bio → recebe consultas agendadas → atende via chat → adiciona notas privadas → finaliza.

## Fora deste escopo

- Videochamada, pagamentos, prescrição eletrônica, integração com CFM/CRP, notificações push (fica um badge de "novas mensagens" no dashboard por enquanto).

Confirma para eu executar a migração e criar as telas?
