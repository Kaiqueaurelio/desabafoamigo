import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { AdminSidebar, AdminSidebarMobile, AdminSidebarToggle } from "@/components/AdminSidebar";
import { loadTheme, saveTheme, type Theme } from "@/lib/theme";
import { ArrowLeft, Monitor, Moon, Sun, Check, Sparkles, Type, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/aparencia")({
  ssr: false,
  beforeLoad: async () => { await ensureAdminAal2(); },
  component: AparenciaPage,
});

const DENSITY_KEY = "desabafo:density";
const FONT_KEY = "desabafo:font-scale";
const REDUCE_MOTION_KEY = "desabafo:reduce-motion";

type Density = "compact" | "cozy" | "comfortable";

function applyDensity(d: Density) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.density = d;
}
function applyFontScale(scale: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--font-scale", String(scale));
  document.documentElement.style.fontSize = `${scale * 100}%`;
}
function applyReduceMotion(on: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", on);
}

function AparenciaPage() {
  const [theme, setThemeState] = useState<Theme>("auto");
  const [density, setDensity] = useState<Density>("cozy");
  const [fontScale, setFontScale] = useState(1);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setThemeState(loadTheme());
    const d = (localStorage.getItem(DENSITY_KEY) as Density) || "cozy";
    const f = Number(localStorage.getItem(FONT_KEY) || "1");
    const r = localStorage.getItem(REDUCE_MOTION_KEY) === "1";
    setDensity(d); setFontScale(f); setReduceMotion(r);
    applyDensity(d); applyFontScale(f); applyReduceMotion(r);
  }, []);

  function pickTheme(t: Theme) {
    setThemeState(t);
    saveTheme(t);
    toast.success("Tema atualizado.");
  }
  function pickDensity(d: Density) {
    setDensity(d); localStorage.setItem(DENSITY_KEY, d); applyDensity(d);
    toast.success("Densidade aplicada.");
  }
  function pickFont(v: number) {
    setFontScale(v); localStorage.setItem(FONT_KEY, String(v)); applyFontScale(v);
  }
  function toggleMotion(v: boolean) {
    setReduceMotion(v);
    localStorage.setItem(REDUCE_MOTION_KEY, v ? "1" : "0");
    applyReduceMotion(v);
  }
  function resetAll() {
    pickTheme("auto");
    pickDensity("cozy");
    pickFont(1);
    toggleMotion(false);
    toast.success("Preferências restauradas.");
  }

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-semibold text-primary">Aparência</span>
          </div>
          <div className="flex items-center gap-3">
            <AdminSidebarToggle className="hidden md:inline-flex" />
            <Link to="/admin" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-6xl gap-6 px-4 py-6 md:flex">
        <AdminSidebar />

        <div className="min-w-0 flex-1 space-y-6">
          <AdminSidebarMobile />

          <div>
            <h1 className="text-xl font-semibold text-foreground">Aparência do painel</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalize tema, densidade e acessibilidade. As preferências ficam salvas neste navegador.
            </p>
          </div>

          {/* Tema */}
          <Card icon={Sparkles} title="Tema" hint="Escolha o modo de cor do painel.">
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { id: "light" as const, label: "Claro", icon: Sun, desc: "Ambiente iluminado" },
                  { id: "dark" as const, label: "Escuro", icon: Moon, desc: "Menos brilho, ideal à noite" },
                  { id: "auto" as const, label: "Sistema", icon: Monitor, desc: "Segue seu dispositivo" },
                ] as const
              ).map((opt) => (
                <OptionCard
                  key={opt.id}
                  active={theme === opt.id}
                  onClick={() => pickTheme(opt.id)}
                  icon={opt.icon}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </Card>

          {/* Densidade */}
          <Card icon={LayoutGrid} title="Densidade" hint="Ajusta o espaçamento entre listas e tabelas.">
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  { id: "compact" as Density, label: "Compacta", desc: "Mais itens visíveis" },
                  { id: "cozy" as Density, label: "Confortável", desc: "Recomendada (padrão)" },
                  { id: "comfortable" as Density, label: "Espaçosa", desc: "Foco e leitura fácil" },
                ]
              ).map((opt) => (
                <OptionCard
                  key={opt.id}
                  active={density === opt.id}
                  onClick={() => pickDensity(opt.id)}
                  label={opt.label}
                  desc={opt.desc}
                />
              ))}
            </div>
          </Card>

          {/* Fonte */}
          <Card icon={Type} title="Tamanho da fonte" hint="Aumente para ler com mais conforto.">
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0.9}
                max={1.2}
                step={0.05}
                value={fontScale}
                onChange={(e) => pickFont(Number(e.target.value))}
                className="flex-1 accent-primary"
                aria-label="Tamanho da fonte"
              />
              <span className="w-14 shrink-0 rounded-lg border border-border bg-background px-2 py-1 text-center text-xs font-medium">
                {Math.round(fontScale * 100)}%
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Prévia: <span className="text-foreground">O cuidado começa por escutar sem julgar.</span>
            </p>
          </Card>

          {/* Acessibilidade */}
          <Card title="Acessibilidade" hint="Reduza animações se elas causarem desconforto.">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-background/40 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Reduzir movimento</p>
                <p className="text-xs text-muted-foreground">
                  Desativa animações e transições longas em toda a interface.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={reduceMotion}
                onClick={() => toggleMotion(!reduceMotion)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  reduceMotion ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${
                    reduceMotion ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
          </Card>

          <div className="flex justify-end">
            <button
              onClick={resetAll}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Restaurar padrões
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function OptionCard({
  active,
  onClick,
  icon: Icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${
        active
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-background/40 hover:border-primary/40 hover:bg-muted"
      }`}
    >
      {Icon && (
        <Icon className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
      )}
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {active && <Check className="size-4 text-primary" />}
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
