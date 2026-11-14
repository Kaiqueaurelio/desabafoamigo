import { createFileRoute, Link } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";

export const Route = createFileRoute("/offline")({
  component: OfflinePage,
  head: () => ({
    meta: [
      { title: "Sem conexão — Desabafo Amigo" },
      { name: "description", content: "Você está sem conexão no momento." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function OfflinePage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-brand-soft text-primary">
          <WifiOff className="size-8" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Você está sem conexão</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Assim que a internet voltar, você pode continuar sua conversa. Enquanto isso, respire
          fundo — três vezes, devagar.
        </p>
        <button onClick={() => location.reload()} className="btn-primary mt-6">
          Tentar novamente
        </button>
        <div className="mt-4">
          <Link to="/" className="text-sm text-primary underline">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
