# Desabafa Amigo — Plano de construção

Projeto grande. Proponho entregar em fases, começando por um MVP funcional e evoluindo. Vou usar a stack do template (React + TypeScript + TanStack Start + Tailwind) e **Lovable Cloud** (Supabase gerenciado) no lugar de Firebase — o template não suporta Firebase nativamente, e Cloud cobre auth, DB, realtime, storage e functions com zero setup.

## Fase 1 — MVP (esta iteração)

Foco: identidade visual, fluxo anônimo do usuário, chat em tempo real, área do voluntário, botão de emergência.

**Telas**
- **/** — Landing: logo, nome "Desabafa Amigo", frase "Você não precisa enfrentar tudo sozinho.", botão "Começar Conversa", link discreto "Sou voluntário".
- **/conversar** — Gera apelido aleatório (Lua Serena, Nuvem Azul…), entra na fila, tela "Estamos procurando alguém disponível…", abre chat quando pareado.
- **/chat/$id** — Interface estilo WhatsApp: bolhas, indicador digitando, entregue/lido, envio de texto e emoji. Botão fixo "Preciso de ajuda urgente" (modal com CVV 188, SAMU 192, Polícia 190).
- **/encerrada** — "Esperamos que esta conversa tenha ajudado você." + Conversar novamente / Encerrar. Apaga histórico.
- **/voluntario/login** — Login email/senha (Cloud Auth).
- **/voluntario** — Dashboard: status (Disponível/Ocupado/Offline), fila de solicitações, aceitar/recusar, chats ativos.
- **/emergencia** — Página dedicada com contatos oficiais.

**Design**
- Paleta: azul escuro `#0F2A47`, azul claro `#4A90E2`, branco, verde de destaque `#22C55E`.
- Tokens semânticos em `src/styles.css` (oklch), modo claro e escuro.
- Tipografia calma, espaçamentos generosos, animações suaves.

**Backend (Lovable Cloud)**
- Tabelas: `volunteers` (perfil + is_psychologist + status), `queue` (usuários anônimos aguardando), `conversations` (pareamento ativo), `messages` (efêmeras, apagadas ao encerrar), `metrics` (contadores anônimos), `user_roles` (admin/volunteer/psychologist via enum + `has_role`).
- Realtime: subscriptions do Supabase para fila e mensagens.
- RLS restritiva: usuário anônimo só vê a própria conversa (via token de sessão local), voluntário só vê conversas atribuídas, admin vê métricas agregadas.
- Trigger: ao mudar `conversations.status` para `ended`, apaga todas as `messages` daquela conversa.
- Pareamento: server function que pega o próximo da fila e atribui ao voluntário que aceitou.

**Segurança realista (declarar limites com honestidade)**
- TLS em trânsito (nativo da plataforma) e AES-256 em repouso (padrão do Postgres/Supabase).
- Mensagens autodestruídas ao encerrar (trigger).
- Sem armazenar IP identificável, sem geolocalização, sem nomes de usuários anônimos.
- **Limitação importante**: E2EE verdadeira (chaves só no cliente, servidor cego) exige troca de chaves entre pares e complica muito o MVP. Vou entregar TLS + criptografia em repouso + auto-destruição. Posso adicionar E2EE real (libsignal/WebCrypto) em fase posterior — sinalizo isso no rodapé de privacidade para não enganar o usuário.
- Rate limit básico via checagem de timestamps por sessão (backend não tem primitiva pronta; se você quiser rate limit robusto depois, faço uma implementação dedicada).

## Fase 2 (depois do MVP)
- Envio de imagem e áudio.
- Categoria "Psicólogo" com roteamento preferencial.
- Painel admin com métricas.
- E2EE real com WebCrypto.
- Notificações push.
- PWA para instalar no celular.

## Detalhes técnicos
- Rotas: TanStack Router file-based em `src/routes/`.
- Estado do chat: TanStack Query + Supabase Realtime channel por conversa.
- Voluntários: rota protegida sob `_authenticated/`.
- Papéis via tabela `user_roles` + função `has_role` (nunca no perfil).
- Server functions para: pareamento, encerrar conversa (dispara purge), atualizar status do voluntário.

## O que preciso confirmar
1. OK usar **Lovable Cloud** (Supabase) em vez de Firebase? (Firebase não é suportado neste template.)
2. OK entregar **Fase 1 (MVP) agora** — texto apenas, sem imagem/áudio, sem painel admin, sem E2EE real ainda — e evoluir depois?
3. Quer que eu já gere a **logo** do app agora?

Se responder "pode ir", começo pela Fase 1 completa.