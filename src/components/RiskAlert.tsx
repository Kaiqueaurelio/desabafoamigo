import { AlertTriangle, PhoneCall } from "lucide-react";

export function RiskAlert() {
  return (
    <div className="mx-auto my-3 max-w-md rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-4 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Percebemos algo importante no que você escreveu.</p>
          <p className="mt-1 text-xs text-foreground">
            Se você está passando por um momento muito difícil, existe ajuda especializada disponível <strong>agora</strong>, 24h por dia.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="tel:188" className="inline-flex items-center gap-1 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
              <PhoneCall className="size-3.5" /> CVV 188
            </a>
            <a href="https://www.cvv.org.br/chat/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive">
              Chat CVV
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
