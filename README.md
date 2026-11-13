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
- Vite e PWA

## Executar localmente

Requisitos: Bun (versão usada pelo CI) e variáveis de ambiente do Supabase.

```bash
git clone https://github.com/Kaiqueaurelio/desabafoamigo.git
cd desabafoamigo
bun install --frozen-lockfile
bun run dev
```

Configure as variáveis de ambiente exigidas pelo projeto no arquivo local apropriado. **Nunca coloque chaves privadas, tokens de serviço ou credenciais reais no Git.**

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

- Aplicativo: https://desabafoamigo.lovable.app
- Repositório: https://github.com/Kaiqueaurelio/desabafoamigo
- Projeto Lovable: https://lovable.dev/projects/ce27e131-caf6-49a0-96ff-b49e0b0eee10
