import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Stethoscope, CalendarClock } from "lucide-react";

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
      <h1 className="text-2xl font-bold text-primary">Profissionais disponíveis</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha alguém para conversar. Você pode agendar um horário depois.</p>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Carregando...</p>
      ) : pros.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Ainda não há profissionais aprovados. Volte em breve.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((p) => (
            <article key={p.user_id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" className="size-14 rounded-full object-cover" />
                ) : (
                  <div className="grid size-14 place-items-center rounded-full bg-brand-soft text-primary">
                    <Stethoscope className="size-6" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{p.full_name ?? "Profissional"}</p>
                  <p className="text-xs text-brand-green">Voluntário(a) treinado(a)</p>
                </div>
              </div>
              {p.specialty && <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{p.specialty}</p>}
              <p className="text-sm text-muted-foreground line-clamp-4">{p.bio ?? "Sem biografia."}</p>
              <Link to="/agendar/$id" params={{ id: p.user_id }} className="btn-primary mt-4 inline-flex items-center justify-center gap-2 text-sm">
                <CalendarClock className="size-4" /> Agendar
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
