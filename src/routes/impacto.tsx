import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/impacto")({
  component: ImpactoPage,
  head: () => ({
    meta: [
      { title: "Impacto — Desabafo Amigo" },
      {
        name: "description",
        content:
          "Números públicos e anonimizados do Desabafo Amigo: conversas realizadas, voluntários ativos e humores compartilhados.",
      },
      { property: "og:title", content: "Impacto — Desabafo Amigo" },
      { property: "og:url", content: "https://desabaoamigo.lovable.app/impacto" },
    ],
    links: [{ rel: "canonical", href: "https://desabaoamigo.lovable.app/impacto" }],
  }),
});

function ImpactoPage() {
  const [nums, setNums] = useState({ conversas: 0, voluntarios: 0, humor: 0 });

  useEffect(() => {
    (async () => {
      const [c, v, m] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase
          .from("volunteers")
          .select("id", { count: "exact", head: true })
          .eq("approval_status", "approved"),
        supabase.from("mood_entries").select("id", { count: "exact", head: true }),
      ]);
      setNums({
        conversas: c.count ?? 0,
        voluntarios: v.count ?? 0,
        humor: m.count ?? 0,
      });
    })();
  }, []);

  return (
    <main id="conteudo" className="mx-auto max-w-4xl px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <Logo size={48} />
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Início
        </Link>
      </div>

      <h1 className="text-4xl font-bold text-primary">Impacto em números</h1>
      <p className="mt-3 max-w-2xl text-foreground/80">
        Nada aqui identifica nenhuma pessoa. São contagens agregadas, atualizadas em tempo real.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Kpi valor={nums.conversas} label="conversas realizadas" />
        <Kpi valor={nums.voluntarios} label="voluntários aprovados" />
        <Kpi valor={nums.humor} label="check-ins de humor" />
      </div>

      <p className="mt-10 rounded-2xl bg-brand-soft p-5 text-sm text-muted-foreground">
        Cada número acima representa uma pessoa que escolheu falar sobre o que sente — e outra que
        se dispôs a ouvir. Obrigado por fazer parte.
      </p>
    </main>
  );
}

function Kpi({ valor, label }: { valor: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <p className="text-4xl font-bold text-primary">{valor.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
