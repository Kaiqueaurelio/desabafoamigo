/**
 * Prompts diários rotativos para o diário emocional.
 * Escolhidos pelo dia do ano — determinístico e sem armazenamento.
 */
const PROMPTS: string[] = [
  "O que mais pesou no seu peito hoje?",
  "Se pudesse mandar uma mensagem para você mesmo(a) de manhã, o que diria?",
  "Qual pequena coisa te deu conforto hoje?",
  "Como seu corpo está agora — tenso, cansado, leve?",
  "Que emoção esteve mais presente hoje?",
  "Do que você sente falta hoje?",
  "O que você faria se ninguém fosse julgar?",
  "Que pensamento fica repetindo na sua cabeça?",
  "Do que você tem orgulho, mesmo pequeno, hoje?",
  "Se seu dia fosse uma cor, qual seria — e por quê?",
  "Existe algo que você precisa deixar ir?",
  "Quem você gostaria de ter por perto agora?",
  "O que você precisa ouvir hoje, mesmo que ninguém diga?",
  "Que gentileza você fez ou recebeu hoje?",
  "Como está sua respiração agora?",
  "Do que você tem tido medo ultimamente?",
  "O que te fez sorrir nos últimos dias?",
  "Que peso você está carregando sem precisar?",
  "Existe uma conversa pendente que te consome?",
  "O que seu 'eu' de 5 anos atrás diria sobre você hoje?",
];

export function todaysPrompt(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const day = Math.floor(diff / (1000 * 60 * 60 * 24));
  return PROMPTS[day % PROMPTS.length];
}
