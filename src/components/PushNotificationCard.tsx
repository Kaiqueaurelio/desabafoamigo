import { useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationCard() {
  const { status, busy, preview, enable, disable, test } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && status !== "granted") return null;

  async function handleEnable() {
    const r = await enable();
    if (r.ok) {
      toast.success("Notificações ativadas!");
      await test();
    } else if (r.reason === "denied") {
      toast.error("Notificações bloqueadas. Habilite nas permissões do navegador.");
    } else if (r.reason === "preview") {
      toast.info("Notificações só funcionam no app publicado (não no preview).");
    } else if (r.reason === "unsupported") {
      toast.error("Seu navegador não suporta notificações push.");
    }
  }

  async function handleDisable() {
    const r = await disable();
    if (r.ok) toast.success("Notificações desativadas.");
  }

  return (
    <section
      role="region"
      aria-label="Configuração de notificações push"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
            status === "granted" ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/10 text-primary"
          }`}
        >
          {status === "granted" ? <BellRing className="size-5" /> : <Bell className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold sm:text-base">Notificações no seu dispositivo</h3>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Receba avisos quando alguém entrar na fila e quando um voluntário aceitar sua conversa —
            mesmo com o app em segundo plano.
          </p>

          {preview && (
            <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-600 dark:text-amber-300">
              Este recurso só funciona no app publicado. Abra pelo domínio público para ativar.
            </p>
          )}
          {status === "denied" && !preview && (
            <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive">
              Você bloqueou notificações. Vá em Configurações do navegador → Notificações para permitir novamente.
            </p>
          )}
          {status === "unsupported" && !preview && (
            <p className="mt-2 rounded-lg bg-muted px-3 py-1.5 text-[11px] text-muted-foreground">
              Seu navegador não suporta notificações. Tente Chrome, Edge, Firefox ou Safari 16.4+.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {status === "granted" ? (
              <>
                <button
                  onClick={() => test().then((r) => toast.success(`Enviado (${r.sent})`))}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  disabled={busy}
                >
                  Enviar teste
                </button>
                <button
                  onClick={handleDisable}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                  disabled={busy}
                >
                  <BellOff className="size-3.5" /> Desativar
                </button>
              </>
            ) : (
              <button
                onClick={handleEnable}
                disabled={busy || preview || status === "unsupported" || status === "denied"}
                className="btn-primary inline-flex items-center gap-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Bell className="size-3.5" />}
                Ativar notificações
              </button>
            )}
            {status !== "granted" && (
              <button
                onClick={() => setDismissed(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Agora não
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
