import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPushConfigStatus,
  getPushOverview,
  searchPushUsers,
  getUserPushLogs,
  sendTestPushToUser,
} from "@/lib/push-diagnostics.functions";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Send, Search, BellRing, Cog, ServerCog, ScrollText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/push")({
  component: PushDiagnosticsPage,
});

type SwStatus = {
  supported: boolean;
  registered: boolean;
  scope?: string;
  permission?: NotificationPermission;
  subscribed: boolean;
  endpointTail?: string;
};

function useSwStatus() {
  const [state, setState] = useState<SwStatus>({ supported: false, registered: false, subscribed: false });
  const refresh = async () => {
    if (typeof window === "undefined") return;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) return setState({ supported: false, registered: false, subscribed: false });
    const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    setState({
      supported,
      registered: !!reg,
      scope: reg?.scope,
      permission: Notification.permission,
      subscribed: !!sub,
      endpointTail: sub?.endpoint.slice(-14),
    });
  };
  useEffect(() => {
    refresh();
  }, []);
  return { ...state, refresh };
}

function StatusPill({ ok, warn, label }: { ok: boolean; warn?: boolean; label: string }) {
  if (ok) return <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 className="size-3.5" />{label}</Badge>;
  if (warn) return <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"><AlertTriangle className="size-3.5" />{label}</Badge>;
  return <Badge className="gap-1 bg-rose-500/15 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300"><XCircle className="size-3.5" />{label}</Badge>;
}

function PushDiagnosticsPage() {
  const qc = useQueryClient();
  const cfgFn = useServerFn(getPushConfigStatus);
  const overviewFn = useServerFn(getPushOverview);
  const searchFn = useServerFn(searchPushUsers);
  const logsFn = useServerFn(getUserPushLogs);
  const testFn = useServerFn(sendTestPushToUser);

  const { data: cfg } = useQuery({ queryKey: ["push", "cfg"], queryFn: () => cfgFn() });
  const { data: overview, isFetching: overviewLoading } = useQuery({
    queryKey: ["push", "overview"],
    queryFn: () => overviewFn(),
    refetchInterval: 30000,
  });

  const sw = useSwStatus();
  const push = usePushNotifications();

  const [q, setQ] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: search, refetch: refetchSearch, isFetching: searching } = useQuery({
    queryKey: ["push", "search", q],
    queryFn: () => searchFn({ data: { q } }),
  });
  const { data: userLogs, isFetching: logsLoading } = useQuery({
    queryKey: ["push", "logs", selectedUser],
    queryFn: () => logsFn({ data: { userId: selectedUser!, limit: 100 } }),
    enabled: !!selectedUser,
  });

  const testMut = useMutation({
    mutationFn: (userId: string) => testFn({ data: { userId } }),
    onSuccess: (r) => {
      toast.success(`Enviado: ${r.sent} · Falhou: ${r.failed}`);
      qc.invalidateQueries({ queryKey: ["push", "logs"] });
      qc.invalidateQueries({ queryKey: ["push", "overview"] });
    },
    onError: (e: any) => toast.error(`Falha: ${e?.message ?? "erro"}`),
  });

  const onResubscribe = async () => {
    const r = await push.resubscribe();
    if (r.ok) {
      toast.success("Nova inscrição criada neste dispositivo.");
      sw.refresh();
    } else {
      toast.error(`Não foi possível reinscrever (${r.reason ?? "erro"}).`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Diagnóstico de notificações push</h1>
        <p className="text-sm text-muted-foreground">
          Verifique VAPID, Service Worker, endpoints com 410/404 e logs por usuário. Reative sua inscrição em um clique.
        </p>
      </header>

      {/* Status cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><Cog className="size-4" /> VAPID</CardTitle>
            <CardDescription>Configuração das chaves do servidor</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Chave pública</span><StatusPill ok={!!cfg?.publicKeyValid} warn={!!cfg?.hasPublicKey && !cfg?.publicKeyValid} label={cfg?.publicKeyValid ? "válida" : cfg?.hasPublicKey ? "formato inválido" : "ausente"} /></div>
            <div className="flex items-center justify-between"><span>Chave privada</span><StatusPill ok={!!cfg?.hasPrivateKey} label={cfg?.hasPrivateKey ? "configurada" : "ausente"} /></div>
            <div className="flex items-center justify-between"><span>Subject</span><StatusPill ok={!!cfg?.subjectValid} warn={!!cfg?.hasSubject && !cfg?.subjectValid} label={cfg?.subjectValid ? "ok" : cfg?.hasSubject ? "formato inválido" : "ausente"} /></div>
            {cfg?.publicKeyPreview && <p className="pt-1 font-mono text-xs text-muted-foreground">{cfg.publicKeyPreview} · {cfg.publicKeyBytes} bytes</p>}
            {cfg?.subjectPreview && <p className="font-mono text-xs text-muted-foreground">{cfg.subjectPreview}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><ServerCog className="size-4" /> Service Worker</CardTitle>
            <CardDescription>Estado deste navegador</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Suporte</span><StatusPill ok={sw.supported} label={sw.supported ? "ok" : "sem suporte"} /></div>
            <div className="flex items-center justify-between"><span>Registrado</span><StatusPill ok={sw.registered} label={sw.registered ? "sim" : "não"} /></div>
            <div className="flex items-center justify-between"><span>Permissão</span><StatusPill ok={sw.permission === "granted"} warn={sw.permission === "default"} label={sw.permission ?? "—"} /></div>
            <div className="flex items-center justify-between"><span>Inscrito</span><StatusPill ok={sw.subscribed} label={sw.subscribed ? "sim" : "não"} /></div>
            {sw.endpointTail && <p className="font-mono text-xs text-muted-foreground">…{sw.endpointTail}</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={sw.refresh}><RefreshCw className="mr-1 size-3.5" /> Atualizar</Button>
              <Button size="sm" onClick={onResubscribe} disabled={push.busy || push.preview}><BellRing className="mr-1 size-3.5" /> Re-inscrever</Button>
              <Button size="sm" variant="outline" onClick={() => push.test().then((r) => toast.info(`Teste: ${r.sent} enviado / ${r.failed} falhou`))} disabled={!sw.subscribed}>Testar em mim</Button>
            </div>
            {push.preview && (
              <p className="text-xs text-muted-foreground">Push desativado no preview/dev. Publique o app para testar de verdade.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><ScrollText className="size-4" /> Entregas (24h)</CardTitle>
            <CardDescription>Resumo global</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span>Inscrições ativas</span><span className="font-semibold">{overview?.activeSubscriptions ?? "—"}</span></div>
            <div className="flex items-center justify-between"><span>Inativas</span><span className="font-semibold">{overview?.inactiveSubscriptions ?? "—"}</span></div>
            <div className="flex items-center justify-between"><span>Enviadas</span><span className="font-semibold text-emerald-600">{overview?.last24h.sent ?? 0}</span></div>
            <div className="flex items-center justify-between"><span>Falhas</span><span className="font-semibold text-rose-600">{overview?.last24h.failed ?? 0}</span></div>
            <div className="flex items-center justify-between"><span>410 Gone</span><span className="font-semibold">{overview?.last24h.gone ?? 0}</span></div>
            <div className="flex items-center justify-between"><span>404 Not Found</span><span className="font-semibold">{overview?.last24h.notFound ?? 0}</span></div>
            <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries({ queryKey: ["push", "overview"] })} disabled={overviewLoading}>
              <RefreshCw className={`mr-1 size-3.5 ${overviewLoading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </CardContent>
        </Card>
      </section>

      {(!cfg?.publicKeyValid || !cfg?.hasPrivateKey) && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Configuração VAPID incompleta</AlertTitle>
          <AlertDescription>Defina VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_SUBJECT nos segredos do backend para habilitar o envio.</AlertDescription>
        </Alert>
      )}

      {/* Status breakdown */}
      {overview?.statusBreakdown7d && Object.keys(overview.statusBreakdown7d).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Códigos HTTP nos últimos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(overview.statusBreakdown7d)
                .sort((a, b) => b[1] - a[1])
                .map(([code, count]) => (
                  <Badge key={code} variant={code === "201" ? "default" : code === "410" || code === "404" ? "destructive" : "secondary"} className="gap-1">
                    {code} <span className="opacity-70">· {count}</span>
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Busca de usuários / logs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Logs por usuário</CardTitle>
          <CardDescription>Busque por ID do usuário (prefixo) ou parte do endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              refetchSearch();
            }}
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="uuid ou fcm.googleapis.com…" className="pl-8" />
            </div>
            <Button type="submit" disabled={searching}>Buscar</Button>
          </form>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(search?.subscriptions ?? []).map((s) => (
                  <TableRow key={`${s.user_id}-${s.endpoint_tail}`} data-state={selectedUser === s.user_id ? "selected" : undefined}>
                    <TableCell className="font-mono text-xs">{s.user_id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs"><span className="text-muted-foreground">{s.endpoint_host}</span> · …{s.endpoint_tail}</TableCell>
                    <TableCell><StatusPill ok={s.active} label={s.active ? "ativa" : "inativa"} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.last_seen_at ? new Date(s.last_seen_at).toLocaleString() : "—"}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedUser(s.user_id)}>Ver logs</Button>
                      <Button size="sm" onClick={() => testMut.mutate(s.user_id)} disabled={testMut.isPending}>
                        <Send className="mr-1 size-3.5" /> Testar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!search || search.subscriptions.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhuma inscrição encontrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {selectedUser && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Logs de <span className="font-mono">{selectedUser.slice(0, 8)}…</span></h3>
                <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>Fechar</Button>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quando</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Título / tag</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(userLogs?.logs ?? []).map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          {l.success ? (
                            <StatusPill ok label={`${l.status_code ?? "ok"}`} />
                          ) : l.stale ? (
                            <StatusPill ok={false} label={`${l.status_code} stale`} />
                          ) : (
                            <StatusPill ok={false} warn label={`${l.status_code ?? "erro"}`} />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs"><span className="text-muted-foreground">{l.endpoint_host}</span> · …{l.endpoint_tail}</TableCell>
                        <TableCell className="text-xs">{l.title ?? "—"}{l.tag ? <span className="text-muted-foreground"> · {l.tag}</span> : null}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={l.error_body ?? ""}>{l.error_body ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!logsLoading && (userLogs?.logs ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sem registros nos últimos 30 dias.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
