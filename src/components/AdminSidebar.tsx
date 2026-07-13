import { Link, useRouterState } from "@tanstack/react-router";
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
} from "lucide-react";

const groups: {
  label: string;
  items: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; tone?: "primary" | "destructive" | "muted" }[];
}[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/admin", label: "Voluntários", icon: Users, tone: "primary" },
      { to: "/admin/metricas", label: "Métricas", icon: BarChart3 },
      { to: "/admin/observabilidade", label: "Observabilidade", icon: Activity },
    ],
  },
  {
    label: "Atendimento",
    items: [
      { to: "/admin/atendimento", label: "Central de atendimento", icon: Headphones, tone: "primary" },
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

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden shrink-0 md:block md:w-64 lg:w-72">
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
                      className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition ${
                        active
                          ? "bg-primary/12 font-semibold text-primary"
                          : "text-foreground/85 hover:bg-muted"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${active ? "text-primary" : toneRing} group-hover:text-foreground`} />
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
    <nav className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
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
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "border-primary bg-primary/12 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
