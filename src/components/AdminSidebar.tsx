import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { useSidebarToggle } from "@/lib/useSidebarToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Headphones,
  Flag,
  Camera,
  BarChart3,
  ScrollText,
  Ban,
  Activity,
  BookHeart,
  KeyRound,
  Users,
  Palette,
  LayoutDashboard,
  LifeBuoy,
  Home,
  HeartHandshake,
  CalendarClock,
  NotebookPen,
  BookOpen,
  Volume2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Menu,
  BellRing,
} from "lucide-react";

const groups: {
  label: string;
  items: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone?: "primary" | "destructive" | "muted";
  }[];
}[] = [
  {
    label: "Meu espaço",
    items: [
      { to: "/inicio", label: "Início", icon: Home },
      { to: "/conversar", label: "Conversar agora", icon: HeartHandshake, tone: "primary" },
      { to: "/consultas", label: "Minhas conversas", icon: CalendarClock },
      { to: "/diario", label: "Meu diário", icon: NotebookPen },
      { to: "/relaxar", label: "Relaxar", icon: Volume2 },
      { to: "/apoio", label: "Central de apoio", icon: BookOpen },
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    label: "Visão geral",
    items: [
      { to: "/admin", label: "Voluntários", icon: Users, tone: "primary" },
      { to: "/admin/usuarios", label: "Usuários e permissões", icon: ShieldCheck },
      { to: "/admin/metricas", label: "Métricas", icon: BarChart3 },
      { to: "/admin/observabilidade", label: "Observabilidade", icon: Activity },
      { to: "/admin/inteligencia", label: "Inteligência de Acolhimento", icon: BarChart3 },
    ],
  },

  {
    label: "Atendimento",
    items: [
      {
        to: "/admin/atendimento",
        label: "Central de atendimento",
        icon: Headphones,
        tone: "primary",
      },
      { to: "/admin/plantao", label: "Plantão de crise", icon: LifeBuoy, tone: "destructive" },
      { to: "/admin/denuncias", label: "Denúncias", icon: Flag, tone: "destructive" },
      { to: "/admin/incidentes", label: "Incidentes de captura", icon: Camera },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { to: "/admin/biblioteca", label: "Biblioteca de acolhimento", icon: BookHeart },
      { to: "/admin/palavras", label: "Palavras bloqueadas", icon: Ban },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/auditoria", label: "Log de auditoria", icon: ScrollText },
      { to: "/admin/passkeys", label: "Chaves de acesso", icon: KeyRound },
      { to: "/admin/push", label: "Diagnóstico de push", icon: BellRing },
      { to: "/admin/aparencia", label: "Aparência", icon: Palette },
    ],
  },
];

const ADMIN_SIDEBAR_KEY = "ui:adminSidebarCollapsed";

export function useAdminSidebar() {
  return useSidebarToggle(ADMIN_SIDEBAR_KEY);
}

export function AdminSidebarToggle({ className = "" }: { className?: string }) {
  const { collapsed, toggle } = useAdminSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!collapsed}
      aria-label={collapsed ? "Abrir menu lateral" : "Fechar menu lateral"}
      title={collapsed ? "Abrir menu" : "Fechar menu"}
      className={`interactive grid size-8 place-items-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground ${className}`}
    >
      {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
    </button>
  );
}

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { collapsed } = useAdminSidebar();

  if (collapsed) return null;

  return (
    <aside className="hidden shrink-0 md:block md:w-64 lg:w-72 animate-fade-in">
      <nav className="sticky top-[68px] flex flex-col gap-5 rounded-2xl border border-border bg-card/70 p-3 backdrop-blur">
        <div className="flex items-center gap-2 px-2 pt-1 text-xs font-medium text-muted-foreground">
          <LayoutDashboard className="size-3.5" />
          Painel administrativo
        </div>
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
                const toneRing =
                  item.tone === "destructive"
                    ? "text-destructive"
                    : item.tone === "primary"
                      ? "text-primary"
                      : "text-muted-foreground";
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={`group interactive relative flex items-center gap-2.5 overflow-hidden rounded-lg px-2 py-2 text-sm press ${
                        active ? "nav-active-row" : "text-foreground/85 hover:bg-muted"
                      }`}
                    >
                      <Icon
                        aria-hidden
                        className={`size-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? "text-primary" : toneRing} group-hover:text-foreground`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Compact horizontal version rendered on mobile above the content. */
export function AdminSidebarMobile() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const flat = groups.flatMap((g) => g.items);
  const current = flat.find((item) =>
    item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to),
  );
  const CurrentIcon = current?.icon ?? LayoutDashboard;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="mb-4 flex items-center justify-between gap-2 md:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground">
          <CurrentIcon aria-hidden className="size-3.5 shrink-0 text-primary/70" />
          <span className="truncate">
            <span className="text-muted-foreground/70">Painel · </span>
            <span className="font-medium text-foreground">{current?.label ?? "Início"}</span>
          </span>
        </div>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Abrir menu administrativo"
            className="interactive grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground/70 hover:bg-muted hover:text-foreground"
          >
            <Menu aria-hidden className="size-4" />
          </button>
        </SheetTrigger>
      </div>

      <SheetContent side="left" className="flex w-[85vw] max-w-sm flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <LayoutDashboard aria-hidden className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold text-primary">
                Painel administrativo
              </SheetTitle>
              <SheetDescription className="text-[11px] text-muted-foreground">
                Gestão da comunidade
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <nav
          aria-label="Navegação administrativa"
          className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
        >
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-1.5">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={`interactive flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] ${
                        active ? "nav-active-row font-semibold" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon
                        aria-hidden
                        className={`size-5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
