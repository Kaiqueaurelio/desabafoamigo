# Acesso de convidado (Supabase)

O botão **Entrar como convidado** chama `supabase.auth.signInAnonymously()` e envia a pessoa para `/inicio`. O código está no frontend; o provedor precisa estar habilitado no projeto Supabase para que a autenticação funcione.

## Configuração necessária no projeto

1. Abra Authentication → Sign In / Providers no painel do Supabase.
2. Habilite **Allow anonymous sign-ins** (provedor Anonymous).
3. Salve e teste em uma janela privada, sem sessão anterior.
4. Configure CAPTCHA (Turnstile ou CAPTCHA invisível) e revise os limites de autenticação antes de divulgar amplamente.

## Regras de segurança obrigatórias antes da produção

- Usuários anônimos recebem a role PostgreSQL `authenticated`; não trate `TO authenticated` como sinônimo de conta permanente.
- Em políticas que precisam distinguir convidados, verifique `(select auth.jwt() ->> 'is_anonymous')::boolean`.
- Garanta que cada linha de dados pessoais/conversas/fila tenha ownership por `auth.uid()`, incluindo `USING` e `WITH CHECK` em políticas de UPDATE.
- Não permita que usuários anônimos consultem ou alterem `user_roles`, perfis de outras pessoas, dados administrativos ou registros de voluntários.
- A autorização de voluntários deve continuar baseada em papel armazenado no banco e nunca em `user_metadata`.
- Teste leitura, inserção, atualização e exclusão com duas sessões anônimas distintas e confirme que uma não consegue acessar dados da outra.
- Revise Storage policies: não conceda acesso amplo a arquivos privados apenas porque a sessão está autenticada.

## Limitações que precisam ser comunicadas

Uma sessão anônima é persistida no dispositivo atual, mas não pode ser recuperada após sair, limpar os dados do navegador ou trocar de dispositivo, a menos que a pessoa vincule um método de autenticação. Não prometa anonimato absoluto: o banco ainda mantém um identificador interno e registros técnicos.

## Estado desta implementação

- [x] Botão e chamada `signInAnonymously()` adicionados em `src/routes/auth.tsx`.
- [ ] Habilitar Anonymous Sign-Ins no painel do Supabase (ação administrativa externa).
- [ ] Revisar e validar as políticas RLS e Storage do projeto.
- [ ] Testar o fluxo completo no ambiente publicado.
- [ ] Opcional: implementar vinculação segura da sessão convidada a e-mail/conta existente, com estratégia de migração de dados.

**Importante:** não aplique políticas SQL genéricas para liberar convidados. As políticas precisam refletir as tabelas e regras reais deste projeto. A conexão administrativa disponível nesta sessão não permitiu consultar o projeto Supabase; por isso, nenhuma configuração ou política de produção foi alterada.
