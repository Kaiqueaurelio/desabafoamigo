import { supabase } from "@/integrations/supabase/client";

/**
 * Conta quantos dias consecutivos (até hoje) o usuário registrou humor.
 * Usado como "streak de auto-cuidado" — apenas informativo, sem gamificação agressiva.
 */
export async function loadStreak(userId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 60);
  const { data } = await supabase
    .from("mood_entries")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return 0;

  const days = new Set(
    data.map((r) => new Date(r.created_at as string).toISOString().slice(0, 10)),
  );

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // se hoje não tem check-in, começa contando desde ontem
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
