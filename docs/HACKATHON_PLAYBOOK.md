# Guia de apresentação — Hackathon Inova Builders AI para Saúde

## Tese em uma frase

O Desabafo Amigo reduz a distância entre sentir que precisa conversar e conseguir chegar a uma pessoa que possa ouvir — usando IA como primeira camada de acolhimento e organização, nunca como substituta de cuidado humano ou serviço de emergência.

## Pitch de 3 minutos

### 0:00–0:30 — O problema

“Muitas pessoas precisam conversar, mas nem sempre sabem com quem falar, têm vergonha de pedir ajuda ou encontram alguém disponível naquele momento. O problema não é apenas falta de informação: é a dificuldade de atravessar o primeiro passo e chegar a uma escuta humana.”

Evite afirmar prevalência, número de vidas salvas ou impacto epidemiológico sem fonte e medição.

### 0:30–1:00 — A proposta

“O Desabafo Amigo reúne três coisas em uma jornada: acolhimento inicial com IA, recursos simples de autocuidado e encaminhamento para voluntários. A pessoa pode começar pela conversa, entender as opções e pedir apoio humano.”

### 1:00–2:15 — Demonstração

Abra `/hackathon` e percorra:

1. Entrada e identidade de exibição.
2. Consentimento e controles de privacidade.
3. Conversa ilustrativa com o Amigo IA.
4. Sinal de atenção e orientação de segurança.
5. Encaminhamento para fila humana.
6. Aceite do voluntário e continuidade no chat.
7. Indicadores demonstrativos.
8. Limites, segurança e transparência.

Deixe claro que os diálogos, a fila, os nomes e os números da demonstração são fictícios. A demo não dispara mensagens, não cria atendimentos reais e não aciona serviços de emergência.

## O que diferencia a solução

- **IA com papel delimitado:** acolhe, organiza o relato e ajuda a pessoa a escolher o próximo passo; não diagnostica nem faz psicoterapia.
- **Passagem para pessoas:** a IA não é o destino obrigatório. A experiência prevê apoio humano.
- **Segurança em camadas:** sinais no texto, instruções de crise, recursos oficiais e possibilidade de encaminhamento humano.
- **Consentimento e escolha:** processamento por IA e memória entre sessões são opções separadas.
- **Continuidade:** recursos como check-in de humor, diário e respiração complementam a conversa.

## Como explicar a segurança sem exagerar

Diga:

- “A triagem é um mecanismo de sinalização, não um diagnóstico.”
- “O sistema combina regras locais e análise do modelo; nenhum dos dois é infalível.”
- “Em situação de risco imediato, orientamos a procurar atendimento de emergência e apoio presencial.”
- “Estamos fortalecendo validação, supervisão humana, governança e proteção de dados.”

Não diga:

- “A IA detecta suicídio com 100% de precisão.”
- “O aplicativo impede suicídios.”
- “Tudo é anônimo” ou “ninguém consegue acessar os dados”.
- “Tem criptografia ponta a ponta” sem implementação e auditoria comprovadas.
- “O aplicativo substitui psicólogo, médico ou serviço público.”

## Perguntas prováveis da banca

### A IA substitui psicólogos?

Não. É uma camada de apoio conversacional e orientação geral. A plataforma deixa explícito que não realiza diagnóstico nem psicoterapia e mantém o encaminhamento humano como parte central da proposta.

### Como lida com risco de suicídio?

Observa sinais no contexto da conversa, pode elevar a prioridade de apoio humano e apresenta caminhos oficiais. Em emergência médica, SAMU 192; em perigo imediato ou violência, Polícia 190; CVV 188 oferece apoio emocional gratuito 24h. A sinalização pode falhar e precisa de supervisão e validação especializada.

### Como evita falsos positivos e falsos negativos?

Não depende apenas de uma palavra isolada. Usa contexto, regras determinísticas e avaliação do modelo. Ainda assim, não é uma ferramenta clínica validada. O próximo passo é avaliação estruturada com profissionais, casos simulados e monitoramento de qualidade sem coletar conteúdo desnecessário.

### Como protege a privacidade?

Explica o processamento por provedores externos, separa consentimento de IA e memória opcional e oferece controles de histórico e exclusão. Não prometemos anonimato absoluto ou criptografia ponta a ponta sem comprovação técnica.

### Como mede impacto?

Primeiro, com métricas operacionais e de experiência: tempo até primeira resposta humana, taxa de conexão, abandono da fila, disponibilidade de voluntários, satisfação voluntária e conclusão do encaminhamento. Resultados clínicos só devem ser avaliados com protocolo, consentimento, instrumentos adequados e supervisão especializada.

### Como escala?

A arquitetura web/PWA e o backend gerenciado permitem evoluir por etapas. A escala depende também de capacidade de voluntariado, governança, proteção de dados, moderação, treinamento e protocolos de crise — não apenas de infraestrutura.

## Métricas que vale instrumentar antes de alegar impacto

| Métrica                            | Definição sugerida                                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| Tempo até primeira resposta humana | Minutos entre entrada na fila e primeiro contato                                      |
| Taxa de conexão                    | Atendimentos aceitos / solicitações válidas                                           |
| Abandono da fila                   | Pessoas que saem antes de serem conectadas / solicitações                             |
| Disponibilidade                    | Minutos com voluntário disponível / período observado                                 |
| Encaminhamento concluído           | Encaminhamentos confirmados / encaminhamentos iniciados                               |
| Experiência percebida              | Pergunta opcional e não clínica após conversa                                         |
| Segurança operacional              | Casos sinalizados revisados conforme protocolo, sem usar o indicador como diagnóstico |

Colete o mínimo necessário, agregue resultados e defina retenção e acesso antes de instrumentar.

## Checklist de 15 minutos antes da banca

- [ ] Abrir a rota `/hackathon` em uma aba anônima.
- [ ] Testar os botões Próximo, Voltar e Reiniciar.
- [ ] Conferir a demonstração em celular e notebook.
- [ ] Deixar o aplicativo de produção aberto em outra aba, mas não usar dados reais na apresentação.
- [ ] Usar somente contas e conversas fictícias de teste.
- [ ] Conferir que nenhum segredo ou chave privada aparece na tela.
- [ ] Verificar conexão com internet e ter capturas de tela como plano B.
- [ ] Não depender de uma chamada real de IA ou de um voluntário para concluir a narrativa.
- [ ] Explicar quais partes são demonstrativas e quais estão operacionais.
- [ ] Não apresentar métricas fictícias como resultados reais.

## Próximos passos pós-hackathon

1. Revisão independente do protocolo de crise por profissional qualificado.
2. Auditoria das políticas RLS e do acesso aos anexos no Supabase.
3. Testes de concorrência na fila para impedir que duas pessoas aceitem a mesma solicitação.
4. Validação de exclusão e retenção de dados.
5. Testes de acessibilidade com usuários e leitores de tela.
6. Piloto controlado com voluntários treinados, consentimento e plano de resposta a incidentes.
