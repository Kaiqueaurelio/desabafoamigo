import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function NpsPrompt({
  conversationId,
  userId,
  onDone,
}: {
  conversationId: string;
  userId: string;
  onDone?: () => void;
}) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    if (score == null) return;
    const { error } = await supabase.from("nps_responses").insert({
      conversation_id: conversationId,
      user_id: userId,
      score,
      comment: comment.trim() || null,
    });
    if (error) {
      toast.error("Não foi possível enviar sua avaliação.");
      return;
    }
    setSent(true);
    toast.success("Obrigado pelo feedback 💜");
    onDone?.();
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Sua opinião nos ajuda a acolher melhor. Obrigado.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">Como foi essa conversa para você?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        0 = nada acolhedora · 10 = muito acolhedora
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setScore(i)}
            aria-label={`Nota ${i}`}
            className={`size-8 rounded-lg border text-sm font-medium transition ${
              score === i
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/50"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Quer nos contar algo? (opcional)"
        rows={2}
        maxLength={500}
        className="mt-3 w-full resize-none rounded-lg border border-border bg-background p-2 text-sm"
      />
      <button
        onClick={submit}
        disabled={score == null}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Enviar avaliação
      </button>
    </div>
  );
}
