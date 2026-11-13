import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Trash2, Lock, Bot, Clock } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPrefs, savePrefs, clearAiHistory, DEFAULT_PREFS, type PrivacyPrefs } from "@/lib/privacyPrefs";
import { useServerFn } from "@tanstack/react-start";
import { clearMyAiMemory } from "@/lib/aiMemory.functions";

export const Route = createFileRoute("/_authenticated/minha-privacidade")({
  head: () => ({ meta: [
    { title: "Minha Privacidade — Desabafo Amigo" },
    { name: "description", content: "Controle como suas conversas e dados são tratados no Desabafo Amigo." },
    { property: "og:title", content: "Minha Privacidade — Desabafo Amigo" },
    { property: "og:description", content: "Sessão temporária, histórico opcional e exclusão de conversas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  const [p, setP] = useState<PrivacyPrefs>(DEFAULT_PREFS);
  const clearMemory = useServerFn(clearMyAiMemory);
  useEffect(() => setP(loadPrefs()), []);
  const upd = (patch: Partial<PrivacyPrefs>) => {
    const n = { ...p, ...patch }; setP(n); savePrefs(n);
    if (patch.keepAiHistory === false) clearAiHistory();
    if (patch.rememberAiContext === false || patch.aiConsent === false) {
      void clearMemory().then(() => toast.success("Memória de contexto apagada")).catch(() => toast.error("Não foi possível apagar a memória agora."));
    }
  };
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold sm:text-3xl"><ShieldCheck className="h-7 w-7 text-primary" />Minha Privacidade</h1>
        <p className="text-muted-foreground">Você decide o que fica guardado. Estas preferências valem para este aparelho.</p>
      </header>

      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bot className="h-5 w-5" />Conversa com a IA</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Row label="Consinto que minhas mensagens sejam processadas por IA" hint="As mensagens são enviadas a um provedor de IA (NVIDIA ou Lovable AI) apenas para gerar a resposta. Não usamos seu nome nem e-mail no pedido.">
            <Switch checked={p.aiConsent} onCheckedChange={(v) => upd({ aiConsent: v })} aria-label="Consentimento de IA" />
          </Row>
          <Row label="Lembrar padrões e contexto entre conversas" hint="Opcional. A IA poderá lembrar padrões que você relatou, preferências e objetivos para retomar o contexto quando voltar. Não guarda diagnósticos nem detalhes de crise. A memória fica na sua conta pelo prazo escolhido abaixo.">
            <Switch checked={p.rememberAiContext} onCheckedChange={(v) => upd({ rememberAiContext: v })} disabled={!p.aiConsent} aria-label="Lembrar padrões e contexto entre conversas" />
          </Row>
          <Row label="Guardar histórico privado da IA neste aparelho" hint="Desligado = sessão temporária: tudo some ao fechar a conversa. O histórico nunca vai para nossos servidores.">
            <Switch checked={p.keepAiHistory} onCheckedChange={(v) => upd({ keepAiHistory: v })} aria-label="Histórico privado" />
          </Row>
          <Row label="Prazo de retenção da memória e do histórico local" hint="A memória de contexto é apagada automaticamente após o prazo escolhido. Se selecionar só esta sessão, ela não será armazenada entre conversas.">
            <select className="rounded-md border bg-background px-2 py-1 text-sm" value={p.retentionDays} onChange={(e) => upd({ retentionDays: Number(e.target.value) as 0 | 7 | 30 })}>
              <option value={0}>Só esta sessão</option><option value={7}>7 dias</option><option value={30}>30 dias</option>
            </select>
          </Row>
          <Button variant="outline" onClick={() => { clearAiHistory(); toast.success("Histórico da IA apagado deste aparelho"); }}><Trash2 className="mr-2 h-4 w-4" />Apagar histórico da IA agora</Button>
          <Button variant="outline" onClick={() => void clearMemory().then(() => toast.success("Padrões e contexto lembrados foram apagados")).catch(() => toast.error("Não foi possível apagar a memória agora."))}><Trash2 className="mr-2 h-4 w-4" />Apagar padrões e contexto lembrados</Button>
        </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-5 w-5" />Como seus dados são protegidos</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• O Amigo IA é uma inteligência artificial de apoio emocional, não é psicólogo, não possui registro profissional e não realiza psicoterapia. Não oferece diagnóstico nem substitui acompanhamento psicológico ou médico.</p>
          <p>• As respostas podem usar princípios gerais de comunicação inspirados na Psicanálise, na Terapia Cognitivo-Comportamental (TCC) e na Terapia Cognitiva Analítica (TCA). Essas referências não significam que você esteja recebendo uma sessão ou tratamento dessas abordagens.</p>
          <p>• Mensagens e anexos enviados à IA são processados por um provedor externo de inteligência artificial (NVIDIA ou Lovable AI), conforme a disponibilidade. Evite incluir senhas, documentos, endereços ou dados que identifiquem você ou outras pessoas.</p>
          <p>• O histórico completo da IA, quando ativado, fica no armazenamento local deste aparelho. A memória de padrões é um resumo separado, armazenado na sua conta Supabase somente com consentimento específico e por 7 ou 30 dias; ao expirar, é removida quando a próxima conversa consultar a memória. Você pode apagá-la a qualquer momento nesta tela.</p>
          <p>• Dados da conta e conversas humanas são armazenados na infraestrutura Supabase. O acesso depende das permissões e políticas de segurança configuradas no serviço; não prometemos anonimato absoluto nem criptografia ponta a ponta.</p>
          <p className="flex items-center gap-1"><Clock className="h-4 w-4" />Para excluir conversas com voluntários ou toda a conta, use <Link to="/meus-dados" className="font-medium text-primary underline">Meus dados</Link>.</p>
        </CardContent></Card>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><div><p className="font-medium">{label}</p><p className="text-sm text-muted-foreground">{hint}</p></div><div className="shrink-0">{children}</div></div>;
}
