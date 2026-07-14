import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { AdminSidebar, AdminSidebarMobile, AdminSidebarToggle } from "@/components/AdminSidebar";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft, Search, ShieldCheck, HeartHandshake, User as UserIcon, Trash2, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { avatarUrl } from "@/lib/avatar";

type AppRole = "admin" | "volunteer" | "psychologist";

type Row = {
  user_id: string;
  display_name: string | null;
  roles: AppRole[];
};

export const Route = createFileRoute("/admin/usuarios")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAdminAal2();
  },
  component: UsuariosPage,
  head: () => ({ meta: [{ title: "Usuários e permissões · Admin" }] }),
});

function UsuariosPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [me, setMe] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    setMe(userRes.user?.id ?? null);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name").order("display_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map<string, Row>();
    (profiles ?? []).forEach((p) =>
      map.set(p.user_id, { user_id: p.user_id, display_name: p.display_name, roles: [] })
    );
    (roles ?? []).forEach((r) => {
      const existing = map.get(r.user_id) ?? { user_id: r.user_id, display_name: null, roles: [] };
      existing.roles.push(r.role as AppRole);
      map.set(r.user_id, existing);
    });
    setRows(Array.from(map.values()));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.display_name ?? "").toLowerCase().includes(term) ||
        r.user_id.toLowerCase().includes(term)
    );
  }, [rows, q]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      admins: rows.filter((r) => r.roles.includes("admin")).length,
      vols: rows.filter((r) => r.roles.includes("volunteer")).length,
    }),
    [rows]
  );

  async function grantRole(userId: string, role: AppRole) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Permissão "${labelForRole(role)}" concedida.`);
    load();
  }

  async function revokeRole(userId: string, role: AppRole) {
    if (role === "admin" && userId === me) {
      toast.error("Você não pode remover a sua própria patente de admin.");
      return;
    }
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Permissão removida.");
    load();
  }

  return (
    <main className="min-h-dvh w-full max-w-full overflow-x-clip bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Logo size={28} className="shrink-0" />
            <span className="truncate text-sm font-semibold text-primary">Usuários e permissões</span>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link to="/admin" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary" aria-label="Voltar ao painel">
              <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Voltar</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl gap-6 overflow-x-clip px-3 py-6 sm:px-4 md:flex">
        <div className="hidden md:flex md:flex-col md:gap-2">
          <AdminSidebarToggle />
          <AdminSidebar />
        </div>

        <div className="min-w-0 flex-1 space-y-5">
          <AdminSidebarMobile />

          <div>
            <h1 className="text-xl font-semibold text-foreground">Controle de acesso</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Somente administradores podem alterar patentes. Voluntários atendem a fila; administradores fazem tudo isso e gerenciam conteúdo.
            </p>
          </div>

          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Contas" value={stats.total} icon={<UserIcon className="size-4 text-muted-foreground" />} />
            <StatCard label="Voluntários" value={stats.vols} icon={<HeartHandshake className="size-4 text-primary" />} />
            <StatCard label="Administradores" value={stats.admins} icon={<ShieldCheck className="size-4 text-brand-green" />} />
          </section>


          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por apelido ou ID..."
              className="pl-9"
              aria-label="Buscar usuários"
            />
          </div>

          <div className="w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
            ) : (
              <div className="w-full max-w-full overflow-x-auto">

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Patentes atuais</TableHead>
                    <TableHead className="w-[220px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const isSelf = r.user_id === me;
                    const missing = (["admin", "volunteer"] as AppRole[]).filter(
                      (role) => !r.roles.includes(role)
                    );
                    return (
                      <TableRow key={r.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={avatarUrl(r.display_name ?? r.user_id, 56)}
                              alt=""
                              className="size-8 rounded-full ring-1 ring-border"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {r.display_name ?? "(sem apelido)"}
                                {isSelf && (
                                  <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                    você
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">{r.user_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {r.roles.length === 0 && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Usuário comum
                              </Badge>
                            )}
                            {r.roles.map((role) => (
                              <RoleBadge key={role} role={role} />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            {missing.length > 0 && (
                              <AddRoleControl userId={r.user_id} options={missing} onGrant={grantRole} />
                            )}
                            {r.roles.length > 0 && (
                              <RemoveRoleMenu
                                userId={r.user_id}
                                roles={r.roles}
                                onRevoke={revokeRole}
                                isSelf={isSelf}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </div>


          <p className="text-[11px] text-muted-foreground">
            As patentes são aplicadas no servidor por políticas de acesso (RLS). Alterações são registradas no log de auditoria.
          </p>
        </div>
      </div>
    </main>
  );
}

function labelForRole(role: AppRole) {
  if (role === "admin") return "Administrador";
  if (role === "volunteer") return "Voluntário(a)";
  return "Escuta especializada";
}

function RoleBadge({ role }: { role: AppRole }) {
  if (role === "admin") {
    return (
      <Badge className="gap-1 bg-brand-green/15 text-brand-green hover:bg-brand-green/20">
        <ShieldCheck className="size-3" /> Administrador
      </Badge>
    );
  }
  if (role === "volunteer") {
    return (
      <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20">
        <HeartHandshake className="size-3" /> Voluntário(a)
      </Badge>
    );
  }
  return <Badge variant="secondary">{labelForRole(role)}</Badge>;
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function AddRoleControl({
  userId,
  options,
  onGrant,
}: {
  userId: string;
  options: AppRole[];
  onGrant: (userId: string, role: AppRole) => void;
}) {
  const [value, setValue] = useState<AppRole | "">("");
  return (
    <div className="flex items-center gap-1">
      <Select value={value} onValueChange={(v) => setValue(v as AppRole)}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Conceder..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((r) => (
            <SelectItem key={r} value={r} className="text-xs">
              {labelForRole(r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="secondary"
        disabled={!value}
        onClick={() => {
          if (!value) return;
          onGrant(userId, value);
          setValue("");
        }}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}

function RemoveRoleMenu({
  userId,
  roles,
  onRevoke,
  isSelf,
}: {
  userId: string;
  roles: AppRole[];
  onRevoke: (userId: string, role: AppRole) => void;
  isSelf: boolean;
}) {
  const [target, setTarget] = useState<AppRole | null>(null);
  return (
    <>
      <Select
        value=""
        onValueChange={(v) => setTarget(v as AppRole)}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs text-destructive">
          <SelectValue placeholder="Revogar..." />
        </SelectTrigger>
        <SelectContent>
          {roles.map((r) => (
            <SelectItem key={r} value={r} className="text-xs" disabled={isSelf && r === "admin"}>
              {labelForRole(r)}
              {isSelf && r === "admin" ? " (você)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogTrigger asChild>
          <span />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover patente?</AlertDialogTitle>
            <AlertDialogDescription>
              A permissão de <strong>{target ? labelForRole(target) : ""}</strong> será revogada imediatamente. O usuário perde o acesso às áreas correspondentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (target) onRevoke(userId, target);
                setTarget(null);
              }}
            >
              <Trash2 className="mr-1 size-3.5" /> Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
