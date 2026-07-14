import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, LifeBuoy, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { raiseEscalation } from "@/lib/crisis.functions";

// Script guiado + botão de escalonamento para o voluntário quando IA/palavras detectam risco alto.
// Nunca coleta localização do outro lado — apenas ajuda o voluntário a agir com protocolo.
export function CrisisVolunteerPanel({
  conversationId,
  userId,
}: {
  conversationId: string;
  userId: string;
}) {
  const [open, setOpen] = useState(true);
  const [escalated, setEscalated] = useState(false);
  const [busy, setBusy] = useState(false);
  const escalate = useServerFn(raiseEscalation);

  async function onEscalate() {
    setBusy(true);
    try {
      await escalate({ data: { conversationId, userId, severity: "high" } });
      setEscalated(true);
      toast.success("Um admin de plantão foi notificado. Continue acolhendo — não está sozinho(a).");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-3 my-2 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-3 text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left font-semibold text-destructive"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="size-4" aria-hidden /> Protocolo de risco — só voluntário(a) vê
        </span>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-foreground">
          <ol className="ml-4 list-decimal space-y-1">
            <li><strong>Escute sem julgar.</strong> Não minimize (“vai passar”), não force positividade.</li>
            <li><strong>Valide o sentimento.</strong> “Entendo que dói. Obrigado(a) por confiar em mim.”</li>
            <li><strong>Pergunte diretamente</strong> se há ideação: “Você está pensando em se machucar?”</li>
            <li><strong>Ofereça recursos concretos</strong>: CVV 188 (24h), SAMU 192, o plano de segurança do próprio app.</li>
            <li><strong>Sugira o plano de segurança</strong> em Configurações → Meu plano de segurança para acionar contato de confiança.</li>
            <li><strong>Não prometa segredo absoluto</strong> nem tente resolver sozinho(a). Escale.</li>
          </ol>

          <div className="rounded-lg border border-border bg-card p-2">
            <p className="font-medium text-primary">Frases de apoio</p>
            <ul className="mt-1 space-y-1">
              <li>“Você não precisa passar por isso sozinho(a). Estou aqui.”</li>
              <li>“Existe ajuda especializada disponível agora, ligando 188.”</li>
              <li>“Você já cuidou de si em algum momento difícil antes? O que ajudou?”</li>
            </ul>
          </div>

          {escalated ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2 text-emerald-300">
              <CheckCircle2 className="size-4" /> Admin de plantão notificado. Continue a escuta.
            </div>
          ) : (
            <button
              type="button"
              onClick={onEscalate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:brightness-110 disabled:opacity-60"
            >
              <LifeBuoy className="size-4" /> {busy ? "Notificando..." : "Escalar para admin de plantão"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
