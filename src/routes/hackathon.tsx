import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ChevronRight, ChevronLeft, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/hackathon")({
  head: () => ({
    meta: [
      { title: "Demonstração — Hackathon Builders AI | Desabafo Amigo AI" },
      {
        name: "description",
        content:
          "Demonstração guiada do Desabafo Amigo AI com dados fictícios para a banca do Hackathon Inova Builders AI para Saúde.",
      },
      { property: "og:title", content: "Desabafo Amigo AI — Demonstração Hackathon" },
      {
        property: "og:description",
        content: "IA + acolhimento humano. Você não precisa enfrentar tudo sozinho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Demo,
});

const STEPS: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Identidade de exibição",
    body: (
      <p>
        A experiência pode exibir um apelido, como <b>“Lua Serena 42”</b>, em vez de um nome
        público. Isso é pseudonimização da interface, não anonimato absoluto: a conta e os dados
        tratados pela infraestrutura continuam sujeitos às regras de privacidade do serviço.
      </p>
    ),
  },
  {
    title: "2. Configuração de privacidade",
    body: (
      <ul className="list-disc pl-5">
        <li>
          Consentimento para IA: <b>ligado</b>
        </li>
        <li>
          Histórico: <b>sessão temporária</b>
        </li>
        <li>
          Retenção: <b>só esta sessão</b>
        </li>
      </ul>
    ),
  },
  {
    title: "3. Conversa com a IA",
    body: (
      <Chat
        lines={[
          ["u", "Tô me sentindo muito sozinho ultimamente."],
          [
            "a",
            "Sinto muito que esteja assim. Sou uma IA e estou aqui para ouvir. Quer me contar o que tem pesado mais?",
          ],
          ["u", "Parece que não tem saída."],
        ]}
      />
    ),
  },
  {
    title: "4. Triagem demonstrativa",
    body: (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
        Sinal detectado: <b>atenção</b> (expressão “não tem saída”). A IA não diagnostica — apenas
        oferece apoio humano prioritário e mostra CVV 188 / SAMU 192. Se a IA falhar, o sistema
        assume cautela e oferece humano.
      </div>
    ),
  },
  {
    title: "5. Solicitação de atendimento humano",
    body: (
      <p>
        Entrada na fila com prioridade. Posição fictícia: <b>1º</b> — espera estimada <b>~3 min</b>.
        2 voluntários fictícios disponíveis.
      </p>
    ),
  },
  {
    title: "6. Encaminhamento simulado",
    body: (
      <p>
        Voluntária fictícia <b>“Ana Escuta”</b> assume a conversa com resumo mínimo da triagem.
        Nenhuma mensagem real é enviada e nenhum serviço de emergência é acionado.
      </p>
    ),
  },
  {
    title: "7. Painel de indicadores",
    body: (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Números cenográficos — não representam usuários, atendimentos ou resultados reais.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Sessões", "128"],
            ["Apoio humano", "37"],
            ["Espera média", "4,2 min"],
            ["Conclusão", "91%"],
          ].map(([l, v]) => (
            <div key={l} className="min-w-0 rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">{l} · fictício</p>
              <p className="text-xl font-semibold">{v}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Na operação real, acompanharemos tempo até a primeira resposta humana, taxa de conexão,
          abandono da fila e experiência percebida — com coleta mínima e agregada.
        </p>
      </div>
    ),
  },
  {
    title: "8. Segurança e transparência",
    body: (
      <div className="space-y-2">
        <p>
          O Amigo IA não diagnostica e não substitui profissionais. Sinais de risco são alertas
          sujeitos a erro, não uma avaliação clínica.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Consentimento separado para processamento por IA e memória opcional.</li>
          <li>Orientação para apoio humano e serviços oficiais em situações de risco.</li>
          <li>Sem promessas de anonimato absoluto ou criptografia ponta a ponta.</li>
        </ul>
        <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
          A tecnologia ajuda a abrir caminho para o cuidado. A decisão responsável envolve pessoas,
          protocolos e serviços preparados.
        </p>
      </div>
    ),
  },
  {
    title: "9. O que queremos validar",
    body: (
      <div className="space-y-2">
        <p>
          O próximo passo é um piloto controlado, com voluntários treinados, supervisão
          especializada e consentimento claro.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Reduzir o tempo para chegar a uma primeira escuta humana.</li>
          <li>Entender em que etapa as pessoas desistem da fila.</li>
          <li>Avaliar clareza, acessibilidade e sensação de acolhimento.</li>
          <li>Validar segurança, privacidade e encaminhamentos antes de ampliar o acesso.</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Não afirmamos impacto clínico ou prevenção de suicídio sem estudos adequados.
        </p>
      </div>
    ),
  },
];

function Chat({ lines }: { lines: [string, string][] }) {
  return (
    <div className="space-y-2">
      {lines.map(([w, t], i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.5 }}
          className={`flex ${w === "u" ? "justify-end" : ""}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${w === "u" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
          >
            {t}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Demo() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-accent px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-accent-foreground">
        <FlaskConical className="mr-1 inline h-4 w-4" />
        Demonstração — Hackathon Builders AI · dados 100% fictícios
      </div>
      <main className="mx-auto w-full max-w-2xl space-y-6 p-3 sm:p-8">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Logo />
          <Button variant="outline" size="sm" onClick={() => setI(0)}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Reiniciar
          </Button>
        </div>
        <h1 className="font-display text-3xl font-semibold">Desabafo Amigo AI</h1>
        <p className="text-muted-foreground">Você não precisa enfrentar tudo sozinho.</p>
        <div
          className="flex gap-1"
          role="progressbar"
          aria-label="Progresso da demonstração"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={i + 1}
        >
          {STEPS.map((_, n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${n <= i ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.section
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3 rounded-2xl border bg-card p-5"
          >
            <span className="rounded bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">
              Demo
            </span>
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <div className="text-sm">{s.body}</div>
          </motion.section>
        </AnimatePresence>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          {i < STEPS.length - 1 ? (
            <Button onClick={() => setI(i + 1)}>
              Próximo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button asChild>
              <Link to="/auth">Experimentar de verdade</Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
