import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

export function RatingDialog({ appointmentId, onDone }: { appointmentId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!rating) { onDone(); return; }
    setSaving(true);
    await supabase.from("appointments").update({ patient_rating: rating, patient_feedback: feedback || null }).eq("id", appointmentId);
    setSaving(false); onDone();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl">
        <h3 className="text-lg font-semibold text-foreground">Como foi seu acolhimento?</h3>
        <p className="mt-1 text-xs text-muted-foreground">Sua opinião ajuda o(a) voluntário(a) a crescer.</p>
        <div className="my-5 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} aria-label={`${n} estrelas`}>
              <Star className={`size-8 transition ${n <= (hover || rating) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} maxLength={300} placeholder="Deixe uma palavra (opcional)"
          className="w-full resize-none rounded-lg border border-border bg-background p-2 text-sm" />
        <div className="mt-4 flex gap-2">
          <button onClick={onDone} className="flex-1 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Pular</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1 text-sm">{saving ? "Enviando..." : "Enviar"}</button>
        </div>
      </div>
    </div>
  );
}
