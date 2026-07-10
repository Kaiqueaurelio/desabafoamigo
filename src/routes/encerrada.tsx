import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/encerrada")({
  component: Ended,
});

function Ended() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-brand-soft px-6 text-center">
      <Logo size={72} className="mb-6" />
      <Heart className="mb-2 size-6 text-brand-green" aria-hidden />
      <h1 className="text-2xl font-semibold text-primary">
        Esperamos que esta conversa tenha ajudado você.
      </h1>
      <p className="mt-3 max-w-sm text-muted-foreground">
        Todo o histórico foi apagado. Você não está sozinho — sempre que precisar, estaremos aqui.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/conversar" className="btn-primary">Conversar novamente</Link>
        <Link
          to="/"
          className="rounded-[var(--radius)] border border-border bg-card px-5 py-3 font-semibold text-foreground transition hover:bg-secondary"
        >
          Encerrar
        </Link>
      </div>
    </main>
  );
}
