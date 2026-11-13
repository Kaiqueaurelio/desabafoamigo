import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Trash2, Lock, Bot, Clock } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadPrefs, savePrefs, clearAiHistory, DEFAULT_PREFS, type PrivacyPrefs } from "@/lib/privacyPrefs";

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
  useEffect(() => setP(loadPrefs()), []);
  const upd = (patch: Partial<PrivacyPrefs>) => { const n = { ...p, ...patch }; setP(n); savePrefs(n); if (patch.keepAiHistory === false) clearAiHistory(); };
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
          <Row label="Guardar histórico privado da IA neste aparelho" hint="Desligado = sessão temporária: tudo some ao fechar a conversa. O histórico nunca vai para nossos servidores.">
            <Switch checked={p.keepAiHistory} onCheckedChange={(v) => upd({ keepAiHistory: v })} aria-label="Histórico privado" />
          </Row>
          <Row label="Retenção do histórico local" hint="Após esse prazo, o histórico é apagado automaticamente.">
            <select className="rounded-md border bg-background px-2 py-1 text-sm" value={p.retentionDays} onChange={(e) => upd({ retentionDays: Number(e.target.value) as 0 | 7 | 30 })}>
              <option value={0}>Só esta sessão</option><option value={7}>7 dias</option><option value={30}>30 dias</option>
            </select>
          </Row>
          <Button variant="outline" onClick={() => { clearAiHistory(); toast.success("Histórico da IA apagado deste aparelho"); }}><Trash2 className="mr-2 h-4 w-4" />Apagar histórico da IA agora</Button>
        </CardContent></Card>

      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-5 w-5" />Como seus dados são protegidos</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Conversas com voluntários ficam no nosso banco com criptografia em trânsito e em repouso, e só você e o voluntário da conversa podem lê-las.</p>
          <p>• Administradores não têm leitura livre das conversas; o painel de gestão mostra só números agregados.</p>
          <p>• Usamos um apelido e avatar gerados. Ainda assim, dados técnicos (como endereço IP) passam pela infraestrutura, por isso não prometemos anonimato absoluto.</p>
          <p className="flex items-center gap-1"><Clock className="h-4 w-4" />Para excluir conversas com voluntários ou toda a conta, use <Link to="/meus-dados" className="font-medium text-primary underline">Meus dados</Link>.</p>
        </CardContent></Card>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><div><p className="font-medium">{label}</p><p className="text-sm text-muted-foreground">{hint}</p></div><div className="shrink-0">{children}</div></div>;
}
