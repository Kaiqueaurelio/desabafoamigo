import { useEffect, useState } from "react";
import { Sun, Moon, MonitorSmartphone } from "lucide-react";
import { loadTheme, saveTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");
  useEffect(() => { setTheme(loadTheme()); }, []);

  const opts: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "Claro", Icon: Sun },
    { value: "dark", label: "Escuro", Icon: Moon },
    { value: "auto", label: "Sistema", Icon: MonitorSmartphone },
  ];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-medium">Aparência</h2>
      <p className="mt-1 text-sm text-muted-foreground">Escolha o tema visual do aplicativo.</p>
      <div role="radiogroup" aria-label="Tema" className="mt-3 grid grid-cols-3 gap-2">
        {opts.map(({ value, label, Icon }) => (
          <button
            key={value}
            role="radio"
            aria-checked={theme === value}
            onClick={() => { setTheme(value); saveTheme(value); }}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs font-medium transition ${
              theme === value ? "border-primary bg-brand-soft text-primary" : "border-border bg-background hover:bg-muted"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
