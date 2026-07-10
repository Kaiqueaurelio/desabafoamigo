import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeartHandshake, CalendarClock } from "lucide-react";
import { avatarUrl } from "@/lib/avatar";

export const Route = createFileRoute("/_authenticated/profissionais")({
  component: List,
});

type Pro = {
  user_id: string; full_name: string | null; specialty: string | null; bio: string | null;
  photo_url: string | null;
};

function List() {
  const [pros, setPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("volunteers")
        .select("user_id, full_name, specialty, bio, photo_url")
        .eq("approval_status", "approved")
        .order("full_name");
      setPros((data ?? []) as Pro[]);
      setLoading(false);
    })();
  }, []);


  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold text-primary">Voluntários(as) disponíveis</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pessoas treinadas em escuta ativa, prontas para te ouvir. Escolha alguém e agende um horário.</p>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Carregando...</p>
      ) : pros.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Ainda não há voluntários(as) disponíveis. Volte em breve.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((p) => (
            <article key={p.user_id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <img
                  src={p.photo_url || avatarUrl(p.full_name ?? p.user_id, 128)}
                  alt=""
                  className="size-14 rounded-full object-cover ring-2 ring-brand-soft"
                />
                <div>
                  <p className="font-semibold text-foreground">{p.full_name ?? "Voluntário(a)"}</p>
                  <p className="text-xs text-brand-green flex items-center gap-1">
                    <HeartHandshake className="size-3" /> Voluntário(a) treinado(a)
                  </p>
                </div>
              </div>
              {p.specialty && <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{p.specialty}</p>}
              <p className="text-sm text-muted-foreground line-clamp-4">{p.bio ?? "Sem descrição."}</p>
              <Link to="/agendar/$id" params={{ id: p.user_id }} className="btn-primary mt-4 inline-flex items-center justify-center gap-2 text-sm">
                <CalendarClock className="size-4" /> Agendar conversa
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
