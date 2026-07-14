import { secureSignOut } from "@/lib/secureSignOut";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { EmergencyButton } from "@/components/EmergencyButton";
import { supabase } from "@/integrations/supabase/client";
import { avatarUrl } from "@/lib/avatar";
import { useSidebarToggle } from "@/lib/useSidebarToggle";
import { Home, Users, CalendarClock, UserCog, LogOut, ShieldCheck, HeartHandshake, NotebookPen, BookOpen, Settings, Wind, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { OnboardingModal } from "@/components/OnboardingModal";
import { RouteFade } from "@/components/RouteFade";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


export function AppShell({ children, user, isPro, isAdmin }: { children: ReactNode; user: User; isPro: boolean; isAdmin: boolean }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [alias, setAlias] = useState<string>("");
  const { collapsed, toggle } = useSidebarToggle("ui:appSidebarCollapsed");


  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      setAlias(data?.display_name ?? "");
    })();
  }, [user.id]);

  async function signOut() {
    await secureSignOut();
    navigate({ to: "/auth" });
  }

  const patientNav = [
    { to: "/inicio", label: "Início", icon: Home },
    { to: "/conversar", label: "Conversar agora", icon: HeartHandshake },
    { to: "/respirar", label: "Respire comigo", icon: Wind, highlight: true },
    { to: "/consultas", label: "Minhas conversas", icon: CalendarClock },
    { to: "/diario", label: "Meu diário", icon: NotebookPen },
    { to: "/apoio", label: "Apoio", icon: BookOpen },
    { to: "/configuracoes", label: "Configurações", icon: Settings },
  ] as const;

  const proNav = [
    { to: "/pro/fila", label: "Fila de escuta", icon: Users },
    { to: "/pro", label: "Minhas conversas", icon: CalendarClock },
    { to: "/pro/perfil", label: "Meu perfil", icon: UserCog },
  ] as const;

  return (
    <div className="flex min-h-dvh bg-background">
      {!collapsed && (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex animate-fade-in">
          <Link to="/inicio" aria-label="Desabafa Amigo — ir para o início" className="group flex items-center gap-3 border-b border-border px-5 py-4 transition-colors hover:bg-brand-soft/40">
            <span className="relative grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-soft to-white shadow-calm ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105">
              <span aria-hidden className="absolute inset-0 rounded-2xl bg-primary/10 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
              <Logo responsive decorative priority className="relative h-10 w-10" />
            </span>
            <div className="leading-tight flex-1">
              <p className="text-base font-semibold text-primary">Desabafa Amigo</p>
              <p className="text-[10px] text-muted-foreground">Escuta acolhedora</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
              aria-label="Fechar menu lateral"
              title="Fechar menu"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeftClose className="size-4" />
            </button>
          </Link>
          <nav className="flex-1 space-y-1 p-3">
            <NavGroup title="Meu espaço">
              {patientNav.map((it) => (
                <NavItem key={it.to} to={it.to} label={it.label} icon={it.icon} active={pathname.startsWith(it.to)} highlight={"highlight" in it && it.highlight} />
              ))}
            </NavGroup>
            {isPro && (
              <NavGroup title="Voluntário(a)">
                {proNav.map((it) => (
                  <NavItem key={it.to} to={it.to} label={it.label} icon={it.icon} active={pathname === it.to || pathname.startsWith(it.to + "/")} />
                ))}
              </NavGroup>
            )}
            {isAdmin && (
              <NavGroup title="Administração">
                <NavItem to="/admin" label="Painel admin" icon={ShieldCheck} active={pathname.startsWith("/admin")} />
              </NavGroup>
            )}
          </nav>
          <div className="border-t border-border p-3">
            <div className="mb-2 flex items-center gap-2 px-1">
              {alias && <img src={avatarUrl(alias, 64)} alt="" className="size-8 rounded-full ring-1 ring-border" />}
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{alias || "..."}</p>
                <p className="truncate text-[10px] text-muted-foreground">Apelido do app</p>
              </div>
            </div>
            <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <LogOut className="size-4" /> Sair
            </button>
          </div>
        </aside>
      )}

      {collapsed && (
        <aside className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3 md:flex animate-fade-in">
          <button
            type="button"
            onClick={toggle}
            aria-label="Abrir menu lateral"
            title="Abrir menu"
            className="interactive grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PanelLeftOpen aria-hidden className="size-4" />
          </button>
          <Link to="/inicio" aria-label="Início" className="interactive mt-1 grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-soft to-white ring-1 ring-primary/15">
            <Logo responsive decorative priority className="h-7 w-7" />
          </Link>
          <div className="mt-2 flex flex-col items-center gap-1">
            {patientNav.slice(0, 5).map((it) => {
              const active = pathname.startsWith(it.to);
              return (
                <Link key={it.to} to={it.to} aria-label={it.label} aria-current={active ? "page" : undefined} title={it.label}
                  className={`interactive grid size-10 place-items-center rounded-xl ${active ? "nav-active-rail" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <it.icon aria-hidden className="size-4" />
                </Link>

              );
            })}
          </div>
          <div className="mt-auto">
            <button onClick={signOut} aria-label="Sair" title="Sair" className="interactive grid size-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut aria-hidden className="size-4" />
            </button>
          </div>
        </aside>
      )}



      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <Link to="/inicio" aria-label="Desabafa Amigo — ir para o início" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Logo responsive decorative priority className="h-11 w-11 sm:h-12 sm:w-12" />
            <span className="text-base font-semibold text-primary">Desabafa</span>
          </Link>
          <button onClick={signOut} aria-label="Sair" className="rounded-md p-2 text-muted-foreground hover:bg-muted">
            <LogOut className="size-4" />
          </button>
        </header>

        <main key={pathname} className="flex-1 overflow-y-auto"><RouteFade>{children}</RouteFade></main>
        <nav aria-label="Navegação principal" className="grid grid-cols-4 border-t border-border bg-card md:hidden">
          {[
            { to: "/inicio", label: "Início", icon: Home },
            { to: "/conversar", label: "Conversar", icon: HeartHandshake },
            { to: "/respirar", label: "Respirar", icon: Wind },
            { to: "/apoio", label: "Apoio", icon: BookOpen },
          ].map((it) => {
            const active = pathname.startsWith(it.to);
            return (
              <Link key={it.to} to={it.to} aria-current={active ? "page" : undefined} aria-label={it.label}
                className={`interactive relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[10px] ${active ? "nav-active-tab" : "text-muted-foreground hover:text-foreground"}`}>
                <it.icon aria-hidden className={`size-5 ${it.to === "/respirar" && !active ? "text-sky-500" : ""}`} />
                <span className={active ? "font-semibold" : undefined}>{it.label}</span>

              </Link>
            );
          })}
        </nav>

      </div>
      <EmergencyButton />
      <OnboardingModal />
    </div>
  );
}

function NavGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({ to, label, icon: Icon, active, highlight }: { to: string; label: string; icon: typeof Home; active: boolean; highlight?: boolean }) {
  const base = "interactive flex items-center gap-3 rounded-lg px-3 py-2 text-sm";
  const cls = active
    ? "nav-active-row"
    : highlight
      ? "bg-gradient-to-r from-sky-500/10 to-transparent text-sky-700 hover:from-sky-500/20 dark:text-sky-300"
      : "text-foreground hover:bg-muted";
  return (
    <Link to={to} aria-current={active ? "page" : undefined} className={`${base} ${cls}`}>
      <Icon aria-hidden className={`size-4 ${highlight && !active ? "text-sky-500" : ""}`} />
      <span className={active ? "font-semibold" : undefined}>{label}</span>
    </Link>
  );
}


