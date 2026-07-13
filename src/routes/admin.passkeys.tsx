import { createFileRoute, Link } from "@tanstack/react-router";
import { ensureAdminAal2 } from "@/lib/adminGuard";
import { PasskeyManager } from "@/components/PasskeyManager";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/passkeys")({
  ssr: false,
  beforeLoad: async () => {
    await ensureAdminAal2();
  },
  component: AdminPasskeys,
});

function AdminPasskeys() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar ao painel
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-primary">Chaves de acesso (passkeys)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre a biometria do seu dispositivo (Windows Hello, Touch ID, Face ID, Android) ou
          uma chave física para entrar sem precisar digitar o código de 6 dígitos toda hora.
          A sessão com passkey vale por 8 horas.
        </p>
      </div>
      <PasskeyManager scope="admin" />
    </main>
  );
}
