# Roadmap — Ondas 11 a 20 (itens 15–50)

Como as ondas 1–10 já entregaram triagem por IA, MFA, dashboards, tema, PWA e "digitando…", proponho agrupar as próximas 36 melhorias em 10 ondas coerentes. Cada onda vira 1–2 mensagens de implementação. Se algum item não fizer sentido para você, é só marcar.

## Onda 11 — Chat mais humano (itens 15–18)
15. Reações rápidas (❤️ 🙏 🤝) em mensagens do voluntário
16. Mensagens de sistema (voluntário entrou / saiu / conversa encerrada)
17. Confirmação de leitura discreta (dois check acolhedores, sem timestamp exato)
18. Indicador de conexão perdida + reenvio automático da última mensagem

## Onda 12 — Retenção e vínculo (itens 19–22)
19. "Meus voluntários favoritos" — voltar a falar com quem já ajudou
20. Lembrete gentil por e-mail 24h após conversa: "como você está hoje?"
21. Streak suave de auto-cuidado (dias com check-in de humor)
22. Frases de conforto rotativas na home

## Onda 13 — Voluntário produtivo (itens 23–26)
23. Ranking pessoal semanal (só o próprio voluntário vê)
24. Meta simples: 3 conversas / semana com barra de progresso
25. Notas privadas persistentes por usuário atendido
26. Atalho de teclado: `Ctrl+Enter` envia, `/t` abre templates rápidos

## Onda 14 — Moderação e segurança (itens 27–30)
27. Palavras/regex bloqueadas configuráveis pelo admin
28. "Pânico do voluntário" — botão para encerrar + reportar em 1 clique
29. Log de sessão do admin (IP, user-agent) na tabela `audit_log`
30. Rate limit em `enqueueMe` (máx 3 entradas/hora por usuário)

## Onda 15 — Acessibilidade AAA (itens 31–33)
31. Navegação 100% por teclado + skip-links em todas as rotas
32. Modo leitura (fonte maior, contraste alto forçado)
33. Descrições de áudio para GIFs/animações da landing

## Onda 16 — SEO e distribuição (itens 34–37)
34. `sitemap.xml` e `robots.txt` gerados por rota pública
35. JSON-LD `Organization` + `WebSite` no root
36. OG image dinâmica por rota (landing, sobre, seja voluntário)
37. Página `/sobre` contando a história (hoje só na landing)

## Onda 17 — Página de captação (itens 38–40)
38. `/seja-voluntario` com depoimentos e FAQ
39. Formulário de doação/apoio (Stripe opcional — pede aprovação separada)
40. Página `/impacto` com números públicos anonimizados

## Onda 18 — Observabilidade (itens 41–43)
41. `error_events` — captura de erros do frontend com stack
42. Métrica de NPS pós-conversa (0–10, opcional)
43. Painel admin de "conversas sem avaliação" para follow-up

## Onda 19 — Performance & PWA (itens 44–46)
44. Lazy-load pesado (Whisper client, exportador PDF) sob demanda
45. Ícones PWA 192/512 + splash screens iOS
46. Precache do shell + fallback offline mínimo (rota `/offline`)

## Onda 20 — Polish final (itens 47–50)
47. Toasts com `sonner` em vez de `alert()`
48. Skeleton loaders em fila, histórico, admin
49. Empty states ilustrados (fila vazia, sem denúncias, etc)
50. Micro-animações de entrada nas rotas autenticadas

---

**Ordem de execução sugerida:** 11 → 14 → 15 → 12 → 13 → 18 → 20 → 19 → 16 → 17
(prioriza segurança, acessibilidade e experiência antes de crescimento/marketing)

**O que fica de fora deste plano** (por precisar de decisão sua):
- Push notifications mobile via FCM (precisa conta Firebase)
- Pagamentos/doações (precisa Stripe)
- App nativo Capacitor
- Tradução da UI para outros idiomas

Se aprovar como está, começo pela Onda 11 no próximo turno e sigo em cascata. Se quiser cortar/trocar ondas ou mudar a ordem, me diga antes.
