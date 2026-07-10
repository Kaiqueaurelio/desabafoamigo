import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flag, X } from "lucide-react";

const REASONS = ["Desrespeito ou agressividade", "Conteúdo inadequado", "Assédio", "Comportamento fora do propósito", "Outro"];

export function ReportButton({ appointmentId, reportedUserId }: { appointmentId: string; reportedUserId: string | null }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSending(false); return; }
    await supabase.from("reports").insert({
      reporter_id: u.user.id,
      reported_user_id: reportedUserId,
      appointment_id: appointmentId,
      reason, details: details || null,
    });
    setSending(false); setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); setDetails(""); }, 1600);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive">
        <Flag className="size-3.5" /> Denunciar
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl">
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted">
              <X className="size-4" />
            </button>
            <h3 className="text-lg font-semibold text-foreground">Denunciar conversa</h3>
            <p className="mt-1 text-xs text-muted-foreground">Sua denúncia é confidencial e será analisada pela nossa equipe.</p>
            {done ? (
              <p className="mt-6 rounded-2xl bg-brand-soft p-4 text-center text-sm text-primary">Obrigado. Recebemos sua denúncia.</p>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <label className="block text-xs font-medium text-foreground">
                  Motivo
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm">
                    {REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium text-foreground">
                  Detalhes (opcional)
                  <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} maxLength={500}
                    className="mt-1 w-full resize-none rounded-lg border border-border bg-background p-2 text-sm" />
                </label>
                <button type="submit" disabled={sending} className="btn-primary w-full text-sm">
                  {sending ? "Enviando..." : "Enviar denúncia"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
