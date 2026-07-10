import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { EmergencyButton } from "@/components/EmergencyButton";
import { supabase } from "@/integrations/supabase/client";
import { avatarUrl } from "@/lib/avatar";
import { Home, Users, CalendarClock, UserCog, LogOut, ShieldCheck, HeartHandshake, NotebookPen, BookOpen, Settings } from "lucide-react";
import { OnboardingModal } from "@/components/OnboardingModal";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";

export function AppShell({ children, user, isPro, isAdmin }: { children: ReactNode; user: User; isPro: boolean; isAdmin: boolean }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [alias, setAlias] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
      setAlias(data?.display_name ?? "");
    })();
  }, [user.id]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const patientNav = [
    { to: "/inicio", label: "Início", icon: Home },
    { to: "/conversar", label: "Conversar agora", icon: HeartHandshake },
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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Logo size={28} />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-primary">Desabafa Amigo</p>
            <p className="text-[10px] text-muted-foreground">Escuta acolhedora</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <NavGroup title="Meu espaço">
            {patientNav.map((it) => (
              <NavItem key={it.to} to={it.to} label={it.label} icon={it.icon} active={pathname.startsWith(it.to)} />
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

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <Link to="/inicio" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-sm font-semibold text-primary">Desabafa</span>
          </Link>
          <button onClick={signOut} aria-label="Sair" className="rounded-md p-2 text-muted-foreground hover:bg-muted">
            <LogOut className="size-4" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
        <nav className="grid grid-cols-4 border-t border-border bg-card md:hidden">
          {[
            ...patientNav,
            ...(isPro ? [{ to: "/pro" as const, label: "Agenda", icon: HeartHandshake }] : []),
          ]
            .slice(0, 4)
            .map((it) => (
              <Link key={it.to} to={it.to} className={`flex flex-col items-center gap-1 py-2 text-[10px] ${pathname.startsWith(it.to) ? "text-primary" : "text-muted-foreground"}`}>
                <it.icon className="size-5" />
                {it.label}
              </Link>
            ))}
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

function NavItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted"}`}>
      <Icon className="size-4" /> {label}
    </Link>
  );
}
