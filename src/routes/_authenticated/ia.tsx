import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Loader2, HeartHandshake, Stethoscope, Wind, X, ShieldAlert, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiChat } from "@/lib/aiChat.functions";
import { enqueueMe, cancelMyQueue } from "@/lib/queue.functions";
import { loadPrefs, AI_HISTORY_KEY, type PrivacyPrefs } from "@/lib/privacyPrefs";
import type { RiskLevel } from "@/lib/aiSafety";

export const Route = createFileRoute("/_authenticated/ia")({
  head: () => ({ meta: [
    { title: "Desabafo Amigo AI — Acolhimento com IA" },
    { name: "description", content: "Converse com uma IA acolhedora e, quando quiser, com um voluntário humano." },
    { property: "og:title", content: "Desabafo Amigo AI" },
    { property: "og:description", content: "Acolhimento emocional híbrido: IA + voluntários treinados." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

type M = { role: "user" | "assistant"; content: string };
const GREETING: M = { role: "assistant", content: "Oi. Eu sou o Amigo IA, uma inteligência artificial de apoio emocional — não sou psicólogo nem substituo um profissional. Posso te ouvir com atenção, ajudar a organizar o que está passando pela sua cabeça e pensar com você em próximos passos, sem julgamentos. O que está pesando mais para você hoje?" };

function Page() {
  const send = useServerFn(aiChat);
  const enqueue = useServerFn(enqueueMe);
  const cancelQueue = useServerFn(cancelMyQueue);
  const [prefs, setPrefs] = useState<PrivacyPrefs | null>(null);
  const [msgs, setMsgs] = useState<M[]>([GREETING]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [risk, setRisk] = useState<RiskLevel>("none");
  const [offerHuman, setOfferHuman] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffError, setHandoffError] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadPrefs(); setPrefs(p);
    if (p.keepAiHistory) {
      try {
        const s = JSON.parse(localStorage.getItem(AI_HISTORY_KEY) || "null") as { at: number; msgs: M[] } | null;
        const maxAge = (p.retentionDays || 0) * 86400000;
        if (s && maxAge && Date.now() - s.at < maxAge) setMsgs(s.msgs);
        else localStorage.removeItem(AI_HISTORY_KEY);
      } catch { /* ignore */ }
    }
  }, []);
  useEffect(() => {
    if (!queueId) return;
    let active = true;
    const channel = supabase.channel(`ai-handoff-${queueId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "queue", filter: `id=eq.${queueId}` }, async (payload) => {
        const row = payload.new as { status: string; conversation_id: string | null };
        if (row.status === "matched" && row.conversation_id) {
          const { data: conv } = await supabase.from("conversations").select("appointment_id").eq("id", row.conversation_id).maybeSingle();
          if (active && conv?.appointment_id) window.location.assign(`/consulta/${conv.appointment_id}`);
        } else if (row.status === "cancelled" && active) {
          setQueueId(null); setQueuePosition(null);
        }
      }).subscribe();
    const refresh = async () => {
      const { data } = await supabase.from("queue").select("id").eq("status", "waiting").order("created_at");
      if (!active) return;
      const index = (data ?? []).findIndex((item) => item.id === queueId);
      setQueuePosition(index >= 0 ? index + 1 : null);
    };
    void refresh();
    const poll = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(poll); void supabase.removeChannel(channel); };
  }, [queueId]);

  async function transferToVolunteer() {
    if (queueId || handoffBusy) return;
    setHandoffBusy(true); setHandoffError("");
    try {
      const recent = msgs.filter((m) => m.role === "user").slice(-3).map((m) => m.content.trim()).filter(Boolean).join(" | ");
      const topic = `Encaminhamento solicitado após conversa com Amigo IA. Contexto compartilhado: ${recent.slice(-360) || "Pessoa pediu acolhimento humano."}`;
      const result = await enqueue({ data: { topic: topic.slice(0, 500), urgency: risk === "urgent" ? "high" : risk === "attention" ? "medium" : "low", preferredLang: navigator.language || "pt-BR" } });
      setQueueId(result.queueId);
    } catch (error) {
      setHandoffError(error instanceof Error ? error.message : "Não foi possível entrar na fila agora.");
    } finally { setHandoffBusy(false); }
  }

  async function leaveVolunteerQueue() {
    if (!queueId) return;
    try { await cancelQueue({ data: { queueId } }); } finally { setQueueId(null); setQueuePosition(null); }
  }

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
    if (prefs?.keepAiHistory && prefs.retentionDays) localStorage.setItem(AI_HISTORY_KEY, JSON.stringify({ at: Date.now(), msgs }));
  }, [msgs, prefs]);

  async function submit() {
    const t = text.trim(); if (!t || busy) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next); setText(""); setBusy(true);
    try {
      const r = await send({ data: { messages: next.slice(1) } });
      setMsgs([...next, { role: "assistant", content: r.reply }]);
      setDegraded(r.degraded);
      if (r.risk.level !== "none") setRisk((cur) => (cur === "urgent" ? cur : r.risk.level));
      if (r.risk.offerHuman) setOfferHuman(true);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Não consegui responder agora. Você pode falar com um voluntário humano ou ligar 188 (CVV)." }]);
      setDegraded(true); setOfferHuman(true); setRisk((c) => (c === "none" ? "attention" : c));
    } finally { setBusy(false); }
  }
  function endSession() { setMsgs([GREETING]); setRisk("none"); setOfferHuman(false); localStorage.removeItem(AI_HISTORY_KEY); }

  if (prefs && !prefs.aiConsent) return (
    <div className="mx-auto max-w-xl space-y-4 p-6 text-center">
      <Bot className="mx-auto h-12 w-12 text-primary" />
      <h1 className="font-display text-2xl font-semibold">Antes de conversar com a IA</h1>
      <p className="text-muted-foreground">Suas mensagens serão processadas por um provedor de IA para gerar respostas. A IA não diagnostica, não prescreve e não substitui ajuda profissional ou de emergência.</p>
      <Button asChild><Link to="/minha-privacidade">Revisar e dar consentimento</Link></Button>
      <p className="text-sm">Prefere uma pessoa? <Link to="/conversar" className="text-primary underline">Falar com um voluntário</Link></p>
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-3xl flex-col gap-3 p-3 sm:p-5">
      <div className="grid grid-cols-3 gap-2">
        <ModeCard icon={Bot} label="Amigo IA" active />
        <ModeCard icon={HeartHandshake} label="Voluntário" to="/conversar" />
        <ModeCard icon={Stethoscope} label="Profissional" to="/apoio" />
      </div>
      <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Este é um espaço de <strong>acolhimento emocional com inteligência artificial</strong>, não uma consulta psicológica. A IA pode ajudar você a refletir e encontrar próximos passos, mas não diagnostica nem substitui um profissional. {prefs?.keepAiHistory ? "Histórico salvo só neste aparelho." : "Sessão temporária: nada é guardado."} A seção de apoio apresenta serviços e redes públicas; não significa que haja psicólogos atendendo dentro do app.</p>

      {offerHuman && !queueId && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-medium text-foreground">Acho que conversar com uma pessoa pode ajudar neste momento.</p>
          <p className="mt-1 text-xs text-muted-foreground">Posso avisar os voluntários e colocar você na fila. Compartilharei apenas um breve contexto das últimas mensagens para ajudar no acolhimento.</p>
          <Button className="mt-3" size="sm" onClick={() => void transferToVolunteer()} disabled={handoffBusy}>
            {handoffBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HeartHandshake className="mr-2 h-4 w-4" />}
            {handoffBusy ? "Encaminhando..." : "Conversar com um voluntário"}
          </Button>
          {handoffError && <p className="mt-2 text-xs text-destructive" role="alert">{handoffError}</p>}
        </div>
      )}
      {queueId && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-semibold"><HeartHandshake className="h-4 w-4" /> Você está sendo encaminhado(a) para um voluntário.</p>
          <p className="mt-1 text-xs text-muted-foreground">{queuePosition ? `Sua posição na fila é ${queuePosition}.` : "Os voluntários foram avisados. Assim que alguém aceitar, a conversa será aberta automaticamente."}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void leaveVolunteerQueue()}>Cancelar encaminhamento</Button>
        </div>
      )}

      <AnimatePresence>{(risk !== "none" || offerHuman) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert"
          className={`rounded-lg border p-3 text-sm ${risk === "urgent" ? "border-destructive bg-destructive/10" : "border-primary/40 bg-primary/5"}`}>
          <p className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4" />{risk === "urgent" ? "Percebi que você pode estar passando por algo muito difícil." : "Uma pessoa pode te acompanhar melhor agora."}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" asChild><Link to="/conversar">Falar com voluntário (prioritário)</Link></Button>
            <Button size="sm" variant="outline" asChild><a href="tel:188"><Phone className="mr-1 h-4 w-4" />CVV 188</a></Button>
            <Button size="sm" variant="outline" asChild><a href="tel:192">SAMU 192</a></Button>
          </div>
          {degraded && <p className="mt-2 text-xs text-muted-foreground">A IA está instável no momento, por isso recomendamos o apoio humano.</p>}
        </motion.div>)}</AnimatePresence>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border bg-card p-3" aria-live="polite">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.content}</div>
          </motion.div>))}
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Amigo IA está preparando uma resposta…</div>}
        <div ref={end} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" asChild><Link to="/respirar"><Wind className="mr-1 h-4 w-4" />Respirar</Link></Button>
        <Button size="sm" variant="ghost" onClick={endSession}><X className="mr-1 h-4 w-4" />Encerrar conversa</Button>
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Escreva o que está sentindo…" aria-label="Mensagem"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }} className="resize-none" />
        <Button type="submit" size="icon" className="h-auto w-12 shrink-0" disabled={busy || !text.trim()} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

function ModeCard({ icon: Icon, label, active, to }: { icon: typeof Bot; label: string; active?: boolean; to?: "/conversar" | "/apoio" }) {
  const cls = `flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium transition ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`;
  return to ? <Link to={to} className={cls}><Icon className="h-5 w-5" />{label}</Link> : <div className={cls} aria-current="page"><Icon className="h-5 w-5" />{label}</div>;
}
