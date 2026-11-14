import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, ArrowRight } from "lucide-react";

export function VolunteerTrainingBanner() {
  const [state, setState] = useState<
    { status: "hidden" } | { status: "pending"; completedCount: number; totalCount: number }
  >({ status: "hidden" });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const { data: vol } = await supabase
        .from("volunteers")
        .select("approval_status, training_completed_at")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (!vol || vol.approval_status !== "pending") return;
      if (vol.training_completed_at) return;

      const [{ count: total }, { data: passed }] = await Promise.all([
        supabase
          .from("volunteer_training_modules")
          .select("id", { count: "exact", head: true })
          .eq("active", true),
        supabase
          .from("volunteer_training_progress")
          .select("module_id")
          .eq("user_id", u.user.id)
          .eq("passed", true),
      ]);
      setState({
        status: "pending",
        completedCount: passed?.length ?? 0,
        totalCount: total ?? 0,
      });
    })();
  }, []);

  if (state.status !== "pending") return null;

  return (
    <section
      role="region"
      aria-label="Trilha de treinamento pendente"
      className="mb-4 rounded-2xl border border-sky-300/30 bg-gradient-to-br from-sky-500/10 to-indigo-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <GraduationCap className="mt-0.5 size-5 shrink-0 text-sky-200" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Conclua sua trilha de voluntário(a)</h3>
          <p className="mt-0.5 text-xs text-slate-300">
            Você concluiu {state.completedCount}/{state.totalCount} módulos. A aprovação da sua
            inscrição fica liberada assim que a trilha estiver completa.
          </p>
          <Link
            to="/pro/treinamento"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-400"
          >
            Continuar trilha <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
