import { useEffect, useRef, useState } from "react";
import { LifeBuoy, Phone, X, MapPin, HeartPulse, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getMySafetyPlan, logEmergencyAction } from "@/lib/crisis.functions";
import { useFocusTrap } from "@/lib/useFocusTrap";

type Plan = {
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  share_location_with_contact: boolean;
} | null;

export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<Plan>(null);
  const [sharing, setSharing] = useState(false);

  const loadPlan = useServerFn(getMySafetyPlan);
  const logAction = useServerFn(logEmergencyAction);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef, { onEscape: () => setOpen(false) });


  useEffect(() => {
    if (!open) return;
    loadPlan().then((row) => setPlan(row as Plan)).catch(() => {});
  }, [open, loadPlan]);

  function callAndLog(kind: "called_cvv" | "called_samu", number: string) {
    logAction({ data: { kind } }).catch(() => {});
    window.location.href = `tel:${number}`;
  }

  async function shareLocationWithContact() {
    if (!plan?.emergency_contact_phone || !plan.share_location_with_contact) return;
    setSharing(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!("geolocation" in navigator)) {
          reject(new Error("Este dispositivo não suporta localização."));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        });
      });
      const { latitude, longitude } = pos.coords;
      const mapsUrl = `https://www.google.com/maps?q=${latitude.toFixed(5)},${longitude.toFixed(5)}`;
      const body = `Estou passando por um momento muito difícil e preciso de você. Minha localização aproximada: ${mapsUrl}`;
      const phone = plan.emergency_contact_phone.replace(/\s+/g, "");
      await logAction({ data: { kind: "shared_location_contact" } }).catch(() => {});
      window.location.href = `sms:${phone}?body=${encodeURIComponent(body)}`;
    } catch (e) {
      toast.error((e as Error).message ?? "Não foi possível obter localização.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      {/* Atalho único de emergência: sempre visível e abre diretamente os recursos de ajuda. */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] right-4 z-40 md:bottom-6 md:right-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Você não está sozinho. Abrir ajuda e contatos de emergência"
          title="Você não está sozinho — ajuda e emergência"
          className="grid size-16 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-xl ring-4 ring-destructive/15 transition hover:scale-105 hover:brightness-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-destructive/40 active:scale-95"
        >
          <LifeBuoy className="size-8" aria-hidden />
          <span className="sr-only">Você não está sozinho. Abrir contatos de emergência</span>
        </button>
      </div>


      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergencia-titulo"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div ref={panelRef} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>

            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="emergencia-titulo" className="text-xl font-semibold text-foreground">
                Você não está sozinho(a)
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
                <X className="size-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Se você está em risco imediato, ligue para um dos serviços oficiais. O Desabafo Amigo é
              escuta voluntária e não substitui atendimento de urgência.
            </p>

            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => callAndLog("called_cvv", "188")}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-brand-soft px-4 py-3 text-foreground transition hover:border-primary hover:bg-secondary"
                >
                  <span className="text-sm font-medium text-left">CVV — Centro de Valorização da Vida (24h)</span>
                  <span className="flex items-center gap-2 font-mono text-base font-semibold text-primary">
                    <Phone className="size-4" aria-hidden /> 188
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => callAndLog("called_samu", "192")}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-brand-soft px-4 py-3 text-foreground transition hover:border-primary hover:bg-secondary"
                >
                  <span className="text-sm font-medium text-left">SAMU — Emergência médica</span>
                  <span className="flex items-center gap-2 font-mono text-base font-semibold text-primary">
                    <Phone className="size-4" aria-hidden /> 192
                  </span>
                </button>
              </li>
              <EmergencyLink label="Bombeiros" number="193" />
              <EmergencyLink label="Polícia Militar" number="190" />
            </ul>

            <div className="mt-5 rounded-xl border border-primary/30 bg-brand-soft/40 p-4">
              <div className="flex items-start gap-2">
                <HeartPulse className="mt-0.5 size-4 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">Meu plano de segurança</p>
                  {plan?.emergency_contact_phone && plan.share_location_with_contact ? (
                    <>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Avisar <strong>{plan.emergency_contact_name || "seu contato"}</strong> pelo SMS do seu
                        celular com sua localização aproximada.
                      </p>
                      <button
                        type="button"
                        onClick={shareLocationWithContact}
                        disabled={sharing}
                        className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                      >
                        {sharing ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
                        Avisar meu contato com localização
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Cadastre um contato de confiança e autorize o envio de localização — só é enviado se
                        você apertar aqui.
                      </p>
                      <Link
                        to="/plano-seguranca"
                        onClick={() => setOpen(false)}
                        className="mt-2 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-4 py-2 text-xs font-semibold text-primary hover:bg-brand-soft"
                      >
                        <HeartPulse className="size-3.5" /> Montar meu plano de segurança
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Fora do Brasil? Procure o serviço de prevenção ao suicídio ou emergência local do seu país.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function EmergencyLink({ label, number }: { label: string; number: string }) {
  return (
    <li>
      <a
        href={`tel:${number}`}
        className="flex items-center justify-between rounded-lg border border-border bg-brand-soft px-4 py-3 text-foreground transition hover:border-primary hover:bg-secondary"
      >
        <span className="text-sm font-medium">{label}</span>
        <span className="flex items-center gap-2 font-mono text-base font-semibold text-primary">
          <Phone className="size-4" aria-hidden /> {number}
        </span>
      </a>
    </li>
  );
}
