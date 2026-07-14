import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, Trash2, Eye, Clock, FileWarning } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade e Segurança — Desabafo Amigo" },
      { name: "description", content: "Como o Desabafo Amigo protege seus dados: apelido gerado pelo app, retenção curta, criptografia em trânsito e direito de apagar sua conta." },
      { property: "og:title", content: "Privacidade e Segurança — Desabafo Amigo" },
      { property: "og:description", content: "Transparência sobre o que coletamos, por quanto tempo guardamos e como você pode apagar tudo." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const items = [
    { icon: Eye, title: "Anonimato por padrão", body: "Você entra com um apelido gerado pelo app (ex: “Lua Serena”) e um avatar aleatório. Nunca pedimos nome real, CPF ou documento." },
    { icon: Lock, title: "Criptografia em trânsito", body: "Toda comunicação usa HTTPS/TLS. Anexos ficam em bucket privado com URLs assinadas de curta duração (2 minutos)." },
    { icon: Clock, title: "Retenção mínima", body: "Mensagens de conversas encerradas são apagadas automaticamente após 7 dias. Registros de incidentes de segurança após 90 dias." },
    { icon: ShieldCheck, title: "Controle de acesso rigoroso", body: "Row Level Security no banco garante que apenas você e o voluntário da sua conversa podem ler as mensagens. Admins veem apenas metadados agregados." },
    { icon: FileWarning, title: "Denúncia e moderação", body: "Você pode denunciar qualquer conversa. Voluntários passam por aprovação humana antes de atender. Incidentes reincidentes bloqueiam contas automaticamente." },
    { icon: Trash2, title: "Direito ao esquecimento (LGPD)", body: "Você pode apagar sua conta e todo o histórico a qualquer momento nas configurações. A remoção é imediata e irreversível." },
  ];
  return (
    <main className="min-h-dvh bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">Privacidade e Segurança</h1>
        <p className="mt-4 text-muted-foreground">
          Escuta acolhedora só funciona quando você confia no espaço. Aqui está, em linguagem simples, o que fazemos para proteger você.
        </p>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-border bg-card p-5">
              <Icon className="size-5 text-primary" aria-hidden />
              <h2 className="mt-3 text-base font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 space-y-4 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">O que coletamos</h2>
          <p>E-mail (para acesso), apelido gerado, avatar gerado, mensagens trocadas em conversas ativas, humor registrado no diário, avaliação da conversa e metadados técnicos mínimos (data, idioma escolhido).</p>
          <h2 className="text-lg font-semibold text-foreground">O que não coletamos</h2>
          <p>Nome real, documento, endereço, telefone, dados de saúde estruturados, cookies de rastreamento ou publicidade.</p>
          <h2 className="text-lg font-semibold text-foreground">Terceiros</h2>
          <p>Banco de dados e autenticação: Lovable Cloud (Supabase). Transcrição e tradução de áudio: Lovable AI (OpenAI Whisper e Google Gemini). Nenhum dado é vendido ou usado para treinar modelos de terceiros.</p>
          <h2 className="text-lg font-semibold text-foreground">Contato</h2>
          <p>Dúvidas ou pedidos LGPD: escreva para <a className="underline" href="mailto:privacidade@desabafo.br">privacidade@desabafo.br</a>.</p>
        </section>

        <p className="mt-10 text-xs text-muted-foreground">Última atualização: julho de 2026.</p>
      </div>
    </main>
  );
}
