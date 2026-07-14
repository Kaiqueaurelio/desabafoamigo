import { Link, useRouterState } from "@tanstack/react-router";
import { useSidebarToggle } from "@/lib/useSidebarToggle";
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
  ChevronDown,
} from "lucide-react";



const groups: {
  label: string;
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; tone?: "primary" | "destructive" | "muted" }[];
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
    ],
  },

  {
    label: "Atendimento",
    items: [
      { to: "/admin/atendimento", label: "Central de atendimento", icon: Headphones, tone: "primary" },
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
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted hover:text-foreground ${className}`}
    >
      {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
      <span className="hidden sm:inline">{collapsed ? "Menu" : "Ocultar"}</span>
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
                  item.to === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.to);
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
                        active
                          ? "nav-active-row"
                          : "text-foreground/85 hover:bg-muted"
                      }`}
                    >
                      <Icon aria-hidden className={`size-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? "text-primary" : toneRing} group-hover:text-foreground`} />
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
  const flat = groups.flatMap((g) => g.items);
  const current = flat.find((item) => item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to));
  const CurrentIcon = current?.icon ?? LayoutDashboard;
  return (
    <details className="group mb-4 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card md:hidden">
      <summary className="interactive flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <CurrentIcon aria-hidden className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Você está em</span>
            <span className="truncate text-sm font-semibold text-foreground">{current?.label ?? "Painel"}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground">
          Menu
          <ChevronDown aria-hidden className="size-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <nav aria-label="Navegação administrativa" className="flex flex-col gap-4 border-t border-border px-3 py-3">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1.5">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">{group.label}</p>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  item.to === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    className={`interactive flex min-h-11 min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-xs leading-tight ${
                      active
                        ? "border-primary bg-primary/12 font-semibold text-primary shadow-sm"
                        : "border-border bg-background font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <Icon aria-hidden className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </details>
  );
}

