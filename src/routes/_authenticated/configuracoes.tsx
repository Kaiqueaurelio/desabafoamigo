import { toast } from "sonner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ExternalLink, History, FileLock2 } from "lucide-react";
import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

// Kept import to preserve toast side-effects elsewhere; noop reference.
void toast;

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Configurações</h1>
      <p className="mt-2 text-sm text-muted-foreground">Controle sua privacidade e sua conta.</p>

      <div className="mt-8 space-y-6">
        <ThemeToggle />
        <AccessibilityPanel />

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-primary" />
            <div>
              <h2 className="font-medium">Privacidade e segurança</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Saiba o que coletamos, por quanto tempo guardamos e como
                protegemos suas conversas.
              </p>
              <a
                href="/privacidade"
                target="_blank"
                rel="noopener"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Ler política de privacidade <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-primary/30 bg-brand-soft/40 p-5">
          <div className="flex items-start gap-3">
            <FileLock2 className="mt-0.5 size-5 text-primary" />
            <div className="flex-1">
              <h2 className="font-medium">Meus dados (LGPD)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Peça uma cópia dos seus dados em JSON ou CSV, ou solicite a
                exclusão da sua conta. Você acompanha o status em tempo real.
              </p>
              <Link
                to="/privacidade"
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <FileLock2 className="size-4" /> Abrir meus dados e privacidade
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <History className="mt-0.5 size-5 text-primary" />
            <div className="flex-1">
              <h2 className="font-medium">Transparência da conta</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Veja os últimos eventos em que sua conta aparece — entradas,
                saídas, ações que você fez ou que aconteceram com você.
              </p>
              <a
                href="/transparencia"
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-brand-soft px-4 py-2 text-sm font-medium text-primary hover:bg-brand-soft/80"
              >
                <History className="size-4" /> Ver histórico da minha conta
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
