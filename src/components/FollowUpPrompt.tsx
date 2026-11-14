import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { respondFollowUp } from "@/lib/training.functions";
import { HeartHandshake, X } from "lucide-react";
import { toast } from "sonner";

type FollowUp = {
  id: string;
  conversation_id: string;
  sent_at: string | null;
  reply_status: string;
};

export function FollowUpPrompt() {
  const [item, setItem] = useState<FollowUp | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const respond = useServerFn(respondFollowUp);

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("conversation_follow_ups")
        .select("id, conversation_id, sent_at, reply_status")
        .eq("user_id", user.user.id)
        .eq("reply_status", "sent")
        .order("scheduled_for", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setItem(data as FollowUp);
    })();
  }, []);

  if (!item) return null;

  async function reply(status: "replied" | "skipped") {
    if (!item) return;
    setBusy(true);
    try {
      await respond({
        data: {
          followUpId: item.id,
          status,
          note: status === "replied" ? note.trim() || undefined : undefined,
        },
      });
      toast.success(
        status === "replied" ? "Obrigado por compartilhar." : "Ok, guardamos com carinho.",
      );
      setItem(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao responder.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      role="region"
      aria-label="Follow-up após conversa"
      className="mb-4 rounded-2xl border border-rose-300/30 bg-gradient-to-br from-rose-500/10 to-fuchsia-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <HeartHandshake className="mt-0.5 size-5 shrink-0 text-rose-200" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">
            Como você está desde nossa última conversa?
          </h3>
          <p className="mt-0.5 text-xs text-slate-300">
            Queríamos saber se algo mudou, mesmo que pouco. Você não precisa responder — mas se
            quiser, estamos aqui.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Como está o coração hoje? (opcional)"
            className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-rose-300/50 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => reply("replied")}
              disabled={busy}
              className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400 disabled:opacity-50"
            >
              Enviar resposta
            </button>
            <button
              onClick={() => reply("skipped")}
              disabled={busy}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          aria-label="Dispensar"
          onClick={() => reply("skipped")}
          className="rounded-full p-1 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </section>
  );
}
