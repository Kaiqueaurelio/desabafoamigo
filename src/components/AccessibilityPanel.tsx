import { useEffect, useState } from "react";
import { Accessibility } from "lucide-react";
import { loadA11yPrefs, saveA11yPrefs, type A11yPrefs } from "@/lib/a11y";

export function AccessibilityPanel() {
  const [prefs, setPrefs] = useState<A11yPrefs>(() => loadA11yPrefs());

  useEffect(() => {
    saveA11yPrefs(prefs);
  }, [prefs]);

  const items: { key: keyof A11yPrefs; label: string; desc: string }[] = [
    {
      key: "highContrast",
      label: "Alto contraste",
      desc: "Cores mais fortes e bordas visíveis para melhor legibilidade.",
    },
    {
      key: "dyslexia",
      label: "Fonte para dislexia",
      desc: "Usa uma tipografia com letras mais espaçadas e diferenciadas.",
    },
    { key: "largeText", label: "Texto maior", desc: "Aumenta o tamanho da fonte em todo o app." },
    {
      key: "reduceMotion",
      label: "Reduzir animações",
      desc: "Desliga transições e efeitos suaves.",
    },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <Accessibility className="mt-0.5 size-5 text-primary" aria-hidden />
        <div className="flex-1">
          <h2 className="font-medium">Acessibilidade</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suas escolhas ficam salvas neste dispositivo.
          </p>
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.key} className="flex items-start justify-between gap-4">
                <label htmlFor={`a11y-${it.key}`} className="flex-1 cursor-pointer">
                  <span className="block text-sm font-medium text-foreground">{it.label}</span>
                  <span className="block text-xs text-muted-foreground">{it.desc}</span>
                </label>
                <button
                  id={`a11y-${it.key}`}
                  role="switch"
                  aria-checked={prefs[it.key]}
                  onClick={() => setPrefs((p) => ({ ...p, [it.key]: !p[it.key] }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                    prefs[it.key] ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block size-5 rounded-full bg-background shadow transition ${
                      prefs[it.key] ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
