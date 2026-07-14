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
                      className={`group relative flex items-center gap-2.5 overflow-hidden rounded-lg px-2 py-2 text-sm transition-all duration-200 ease-out press ${
                        active
                          ? "bg-primary/12 font-semibold text-primary shadow-sm"
                          : "text-foreground/85 hover:translate-x-0.5 hover:bg-muted"
                      }`}
                    >
                      {active && <span aria-hidden className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                      <Icon className={`size-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? "text-primary" : toneRing} group-hover:text-foreground`} />
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
  return (
    <nav
      aria-label="Navegação administrativa"
      className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 pt-1 md:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {flat.map((item) => {
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
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium leading-none transition active:scale-[0.97] ${
              active
                ? "border-primary bg-primary/12 text-primary shadow-sm"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

