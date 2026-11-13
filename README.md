# Desabafo Amigo

**Acolhimento emocional com tecnologia e conexão humana.**

O Desabafo Amigo é uma plataforma de apoio emocional que combina uma experiência conversacional com IA, encaminhamento para voluntários e recursos de orientação em situações de crise. O objetivo é reduzir a barreira para pedir ajuda e facilitar a conexão com uma pessoa disponível para ouvir.

> O produto é uma ferramenta de apoio. Não é serviço de emergência, não substitui psicoterapia, avaliação clínica ou atendimento médico.

## O que existe no produto

- **Amigo IA:** conversa de apoio emocional com limites explícitos, consentimento para processamento por IA e opção de não manter memória entre sessões.
- **Encaminhamento humano:** fila de espera, triagem inicial e chat entre pessoa atendida e voluntário.
- **Sinais de segurança:** regras locais e avaliação do modelo observam sinais de risco; a interface orienta a procurar serviços humanos e oficiais. Isso não é diagnóstico nem detector clínico validado.
- **Recursos de cuidado:** check-in de humor, exercícios de respiração, diário e conteúdos de apoio.
- **Área de voluntariado:** fila de solicitações e ferramentas para conduzir conversas.
- **Administração:** indicadores operacionais, gestão e trilhas de auditoria conforme permissões.
- **Privacidade:** controles para consentimento, histórico local e memória opcional; informações sobre tratamento de dados disponíveis na área de privacidade.

## Tecnologias

- React 19, TypeScript e Tailwind CSS
- TanStack Start / TanStack Router
- Supabase (Auth, PostgreSQL e Realtime)
- Vitest e Testing Library
- Playwright para testes end-to-end e responsividade
- Vite, PWA e Cloudflare Workers (hospedagem)\n- NVIDIA NIM para LLM; NVIDIA Magpie para síntese de voz

## Executar localmente

Requisitos: Node.js 22, npm e variáveis de ambiente do Supabase e NVIDIA.

```bash
git clone https://github.com/Kaiqueaurelio/desabafoamigo.git
cd desabafoamigo
bun install --frozen-lockfile
bun run dev
```

Configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NVIDIA_API_KEY` e `NVIDIA_API_KEY_VOICE` no ambiente do servidor. Para desenvolvimento local, use `.env` (não versionado). **Nunca coloque chaves privadas, tokens de serviço ou credenciais reais no Git.**

## Qualidade e testes

```bash
bun run lint
bun run test
bun run build:dev
bun run build:prod
bun run test:e2e
```

Para testar rotas autenticadas no Playwright, configure `E2E_AUTH_STORAGE_STATE` com um arquivo de sessão de teste. Para testar uma conversa humana específica, configure também `E2E_TEST_APPOINTMENT_ID`. Use somente contas e dados fictícios preparados para teste.

## Demonstração do Hackathon

- Rota pública: `/hackathon`
- Roteiro, fala de 3 minutos, perguntas da banca e checklist: [docs/HACKATHON_PLAYBOOK.md](docs/HACKATHON_PLAYBOOK.md)

A demonstração usa cenários e indicadores fictícios. Não confunda a simulação com dados de produção, atendimentos reais ou resultados clínicos.

## Segurança, privacidade e limites conhecidos

- Não prometa anonimato absoluto, criptografia ponta a ponta ou confidencialidade absoluta. A infraestrutura, as permissões, os provedores externos e as configurações de produção influenciam o tratamento dos dados.
- Mensagens enviadas à IA podem ser processadas por provedores externos de IA. A pessoa deve receber informação clara e consentir antes do processamento.
- A memória entre sessões é opcional e separada do histórico local. A migração SQL correspondente precisa estar aplicada no Supabase para que a persistência funcione.
- Os sinais de risco são mecanismos de apoio à decisão e encaminhamento, sujeitos a falsos positivos e falsos negativos. Não substituem avaliação humana treinada nem protocolo clínico.
- Em risco imediato no Brasil: SAMU 192 para emergência médica; Polícia 190 em perigo imediato/violência; CVV 188 para apoio emocional 24h. Bombeiros 193 quando houver necessidade de resgate.
- Antes de uso público em escala, revisar LGPD, termos, políticas RLS, armazenamento de anexos, retenção, resposta a incidentes e protocolo de proteção com profissionais qualificados.

## Princípios de produto

1. Acolher sem julgar.
2. Oferecer escolha e consentimento.
3. Facilitar a passagem para apoio humano.
4. Tratar sinais de crise com prudência e encaminhamento claro.
5. Ser transparente sobre o que a tecnologia faz — e o que não faz.

## Links

- Aplicativo: será publicado no endereço `*.workers.dev` após configurar o Cloudflare Workers
- Repositório: https://github.com/Kaiqueaurelio/desabafoamigo
- Projeto Lovable: https://lovable.dev/projects/ce27e131-caf6-49a0-96ff-b49e0b0eee10


## Deploy independente do Lovable (Cloudflare Workers)

O deploy automático está em `.github/workflows/deploy-cloudflare.yml`. Configure os seguintes **GitHub Actions Secrets** no repositório:

- `CLOUDFLARE_API_TOKEN` — token com permissões Workers Scripts: Edit e Account Settings: Read.
- `CLOUDFLARE_ACCOUNT_ID` — ID da conta Cloudflare.
- `SUPABASE_URL` — URL do projeto Supabase existente.
- `SUPABASE_PUBLISHABLE_KEY` — chave pública/publishable do Supabase.
- `NVIDIA_API_KEY` — chave NVIDIA NIM para chat.
- `NVIDIA_API_KEY_VOICE` — chave NVIDIA para Magpie TTS (pode ser a mesma credencial, se autorizada pelo NVIDIA).

O workflow publica as chaves como secrets do Worker (não as inclui no bundle do navegador). O Supabase continua sendo o backend de autenticação, banco, storage e realtime; ele não depende do Lovable.

A conversa por voz usa reconhecimento de fala do navegador em pt-BR, NVIDIA NIM para gerar a resposta e NVIDIA Magpie Multilingual para sintetizar áudio. Isso é uma conversa por turnos, não full-duplex. A síntese usa o Function ID oficial do Magpie Multilingual. O nome de voz padrão pode ser sobrescrito por `NVIDIA_TTS_VOICE`.

A transcrição de anexos de áudio enviados no chat exige um endpoint HTTP próprio do NVIDIA Riva em `NVIDIA_ASR_HTTP_URL`; o endpoint hospedado Parakeet documenta gRPC. Sem esse endpoint, o recurso informa a limitação e não envia áudio para um provedor alternativo.

Depois de adicionar os GitHub Secrets, faça um push em `main` ou execute manualmente o workflow **Deploy Desabafo Amigo to Cloudflare Workers** em Actions. Configure o domínio em Workers & Pages após o primeiro deploy.
