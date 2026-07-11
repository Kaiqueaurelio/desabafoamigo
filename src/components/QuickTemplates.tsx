import { useState } from "react";
import { MessageSquareHeart, ChevronDown } from "lucide-react";

/**
 * Templates de acolhimento para voluntários — inserção rápida no chat.
 * Não substituem escuta ativa: são pontos de partida.
 */
const TEMPLATES: { group: string; items: string[] }[] = [
  {
    group: "Abertura",
    items: [
      "Olá, obrigado(a) por confiar em compartilhar comigo. Estou aqui para escutar no seu tempo.",
      "Oi. Fico feliz que você tenha entrado. Como você está se sentindo agora?",
      "Bem-vindo(a). Não precisa se apressar — pode escrever como se sentir mais confortável.",
    ],
  },
  {
    group: "Validação",
    items: [
      "Faz sentido você se sentir assim depois de tudo o que descreveu.",
      "O que você está passando é pesado. Não é fraqueza sentir isso.",
      "Obrigado(a) por dividir isso comigo — não é fácil pôr em palavras.",
    ],
  },
  {
    group: "Abrir mais",
    items: [
      "Quer me contar um pouco mais sobre isso?",
      "Como isso tem afetado seu dia a dia?",
      "Quando você percebe que esse sentimento fica mais forte?",
    ],
  },
  {
    group: "Encerramento",
    items: [
      "Você foi corajoso(a) em vir aqui hoje. Cuide de si nas próximas horas.",
      "Lembre-se: se sentir que precisa de apoio urgente, o CVV (188) atende 24h, gratuito e sigiloso.",
      "Pode voltar sempre que precisar. Aqui é um espaço seu.",
    ],
  },
];

export function QuickTemplates({ onPick }: { onPick: (text: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        aria-expanded={open}
        aria-label="Templates de acolhimento"
      >
        <MessageSquareHeart className="size-3.5 text-primary" aria-hidden />
        Templates
        <ChevronDown className={`size-3 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-30 mb-2 max-h-80 w-80 overflow-y-auto rounded-2xl border border-border bg-popover p-3 shadow-lg"
        >
          {TEMPLATES.map((g) => (
            <div key={g.group} className="mb-2 last:mb-0">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.group}
              </p>
              <ul className="space-y-1">
                {g.items.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => { onPick(t); setOpen(false); }}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-[12px] leading-snug text-foreground hover:bg-muted"
                    >
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
            Adapte sempre à pessoa que está do outro lado. Templates são só apoio.
          </p>
        </div>
      )}
    </div>
  );
}
