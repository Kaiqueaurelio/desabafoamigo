import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "volunteer" | "psychologist";

export type Permissions = {
  loading: boolean;
  userId: string | null;
  roles: AppRole[];
  isAdmin: boolean;
  isVolunteer: boolean;
  /** True para admins — usar como gate visual em botões/ações de escrita/gerência. */
  canManageContent: boolean;
  canManageUsers: boolean;
  canModerate: boolean;
};

const empty: Permissions = {
  loading: true,
  userId: null,
  roles: [],
  isAdmin: false,
  isVolunteer: false,
  canManageContent: false,
  canManageUsers: false,
  canModerate: false,
};

/**
 * Hook central de autorização no cliente.
 * A fonte de verdade continua sendo o banco (RLS + has_role), este hook
 * apenas espelha o estado atual para que a UI mostre/esconda controles.
 */
export function usePermissions(): Permissions {
  const [state, setState] = useState<Permissions>(empty);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        if (!cancelled) setState({ ...empty, loading: false });
        return;
      }
      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = ((rows ?? []).map((r) => r.role) as AppRole[]) ?? [];
      const isAdmin = roles.includes("admin");
      const isVolunteer = roles.includes("volunteer");
      if (cancelled) return;
      setState({
        loading: false,
        userId: user.id,
        roles,
        isAdmin,
        isVolunteer,
        canManageContent: isAdmin,
        canManageUsers: isAdmin,
        canModerate: isAdmin,
      });
    }
    load();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

/**
 * Wrapper simples para esconder elementos que exigem permissão.
 * Fallback opcional (ex.: aviso "somente administradores").
 */
export function RequirePermission({
  when,
  fallback = null,
  children,
}: {
  when: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  return <>{when ? children : fallback}</>;
}
