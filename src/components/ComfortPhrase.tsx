import { useEffect, useState } from "react";

const PHRASES = [
  "Você não precisa ter tudo resolvido para merecer descanso.",
  "Sentir é humano. Você tem direito ao seu tempo.",
  "Um passo pequeno hoje já é movimento.",
  "Falar sobre o que dói é um ato de coragem.",
  "Você merece ser ouvido(a) sem julgamento.",
  "Respira. Você já sobreviveu a 100% dos seus piores dias.",
  "Pedir ajuda é um sinal de força, não de fraqueza.",
  "Está tudo bem não estar bem hoje.",
];

export function ComfortPhrase() {
  const [i, setI] = useState(() => Math.floor(Math.random() * PHRASES.length));
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % PHRASES.length), 8000);
    return () => clearInterval(id);
  }, []);
  return (
    <p
      key={i}
      className="animate-in fade-in duration-700 text-center text-sm italic text-primary/80"
      aria-live="polite"
    >
      "{PHRASES[i]}"
    </p>
  );
}
