const adjectives = [
  "Lua", "Nuvem", "Estrela", "Montanha", "Rio", "Sol", "Chuva", "Vento", "Mar",
  "Bosque", "Aurora", "Neve", "Areia", "Pedra", "Fogo", "Céu", "Onda", "Folha",
];
const nouns = [
  "Serena", "Azul", "Verde", "Silente", "Calma", "Tranquila", "Andarilho",
  "Suave", "Livre", "Sereno", "Discreto", "Amiga", "Amigo", "Doce", "Leve",
];

export function generateAlias(): string {
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${a} ${n} ${num}`;
}
