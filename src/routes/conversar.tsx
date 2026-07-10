import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { EmergencyButton } from "@/components/EmergencyButton";
import { supabase } from "@/integrations/supabase/client";
import { ensureAnonymousSession } from "@/lib/anon-session";
import { generateAlias } from "@/lib/alias";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/conversar")({
  component: Waiting,
});

function Waiting() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "waiting" | "error">("loading");
  const [message, setMessage] = useState("Preparando um espaço seguro para você…");
  const aliasRef = useRef<string>(generateAlias());

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let userId: string | null = null;

    (async () => {
      try {
        const session = await ensureAnonymousSession();
        if (!session) throw new Error("Sessão não iniciada");
        userId = session.user.id;

        // Store alias in sessionStorage so it survives navigation to chat
        sessionStorage.setItem("da_alias", aliasRef.current);

        // Check for already-active conversation
        const { data: existing } = await supabase
          .from("conversations")
          .select("id, status")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();
        if (existing && !cancelled) {
          navigate({ to: "/chat/$id", params: { id: existing.id } });
          return;
        }

        // Enter queue
        await supabase.from("queue").upsert({
          user_id: userId,
          alias: aliasRef.current,
        }, { onConflict: "user_id" });

        await supabase.from("metrics").insert({ event: "joined_queue" });

        if (cancelled) return;
        setStatus("waiting");
        setMessage("Estamos procurando alguém disponível para conversar com você.");

        // Listen for a conversation created for us
        channel = supabase
          .channel(`user-conv-${userId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "conversations", filter: `user_id=eq.${userId}` },
            (payload) => {
              const row = payload.new as { id: string };
              if (row?.id) navigate({ to: "/chat/$id", params: { id: row.id } });
            },
          )
          .subscribe();
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setStatus("error");
          setMessage("Não foi possível iniciar. Tente novamente em instantes.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      // Leave the queue on unmount if user navigated away without matching
      if (userId) supabase.from("queue").delete().eq("user_id", userId).then(() => {});
    };
  }, [navigate]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-brand-soft px-6 text-center">
      <Logo size={80} className="mb-6" />
      <h1 className="text-2xl font-semibold text-primary">Seu apelido é</h1>
      <p className="mt-2 rounded-full bg-card px-4 py-1 text-lg font-medium text-brand-green shadow-sm">
        {aliasRef.current}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        {status !== "error" && <Loader2 className="size-8 animate-spin text-accent" aria-hidden />}
        <p className="max-w-sm text-muted-foreground">{message}</p>
      </div>
      <p className="mt-10 text-xs text-muted-foreground max-w-xs">
        Você é totalmente anônimo. Só a pessoa que aceitar sua conversa poderá ler suas mensagens,
        e todo o histórico será apagado ao encerrar.
      </p>
      <EmergencyButton />
    </main>
  );
}
