import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Loader2, HeartHandshake, Stethoscope, Wind, X, ShieldAlert, Phone, Paperclip, Image as ImageIcon, FileAudio, FileVideo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { aiChat } from "@/lib/aiChat.functions";
import { enqueueMe, cancelMyQueue } from "@/lib/queue.functions";
import { loadPrefs, AI_HISTORY_KEY, type PrivacyPrefs } from "@/lib/privacyPrefs";
import { assessRisk, type RiskLevel } from "@/lib/aiSafety";

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
type PendingMedia = { file: File; kind: "image" | "audio" | "video" };
const GREETING: M = { role: "assistant", content: "Oi. Eu sou o Amigo IA, uma inteligência artificial de apoio emocional — não sou psicólogo nem substituo um profissional. Posso te ouvir com atenção, ajudar a organizar o que está passando pela sua cabeça e pensar com você em próximos passos, sem julgamentos. O que está pesando mais para você hoje?" };

async function toDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result.replace(/^data:[^;]+;/, `data:${file.type.split(";")[0]};`)) : reject(new Error("Falha ao ler arquivo."));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}
async function extractVideoFrames(file: File): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video"); video.preload = "metadata"; video.muted = true; video.src = url;
    await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error("Não foi possível abrir o vídeo.")); });
    if (!Number.isFinite(video.duration) || video.duration > 30) throw new Error("O vídeo deve ter até 30 segundos.");
    const times = [...new Set([0, Math.min(1, video.duration / 2), Math.max(0, video.duration - 0.2)])];
    const frames: string[] = [];
    for (const time of times) {
      video.currentTime = time;
      await new Promise<void>((resolve, reject) => { video.onseeked = () => resolve(); video.onerror = () => reject(new Error("Falha ao processar o vídeo.")); });
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.72));
    }
    return frames;
  } finally { URL.revokeObjectURL(url); }
}

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
  const mediaInput = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [mediaError, setMediaError] = useState("");

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
      const { data: current } = await supabase.from("queue")
        .select("status, conversation_id").eq("id", queueId).maybeSingle();
      if (!active || !current) return;
      if (current.status === "matched" && current.conversation_id) {
        const { data: conv } = await supabase.from("conversations")
          .select("appointment_id").eq("id", current.conversation_id).maybeSingle();
        if (active && conv?.appointment_id) window.location.assign(`/consulta/${conv.appointment_id}`);
        return;
      }
      if (current.status === "cancelled") {
        setQueueId(null); setQueuePosition(null); return;
      }
      const { data } = await supabase.from("queue").select("id")
        .eq("status", "waiting").order("created_at");
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

  function pickMedia(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []); event.target.value = "";
    for (const file of files) {
      const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : null;
      if (!kind) { setMediaError("Envie uma imagem, áudio ou vídeo."); continue; }
      const limit = kind === "image" ? 5 : kind === "audio" ? 8 : 25;
      if (file.size > limit * 1024 * 1024) { setMediaError(`O arquivo excede o limite de ${limit} MB.`); continue; }
      setMedia((current) => current.length >= 3 ? current : [...current, { file, kind }]);
      setMediaError("");
    }
  }
  async function submit() {
    const t = text.trim(); if ((!t && !media.length) || busy) return;
    const selected = media;
    const labels = selected.map((item) => `[Anexo: ${item.file.name}]`).join(" ");
    const next = [...msgs, { role: "user" as const, content: [t, labels].filter(Boolean).join("\n") }];
    const localRisk = assessRisk(next.filter((message) => message.role === "user").map((message) => message.content).join("\n"), 0);
    if (localRisk.level !== "none") setRisk((current) => current === "urgent" ? current : localRisk.level);
    if (localRisk.offerHuman) setOfferHuman(true);
    setMsgs(next); setText(""); setMedia([]); setBusy(true);
    try {
      const attachments: { kind: "image" | "audio" | "video-frame"; mimeType: string; name: string; dataUrl: string }[] = [];
      for (const item of selected) {
        if (item.kind === "video") {
          const frames = await extractVideoFrames(item.file);
          frames.forEach((dataUrl) => attachments.push({ kind: "video-frame", mimeType: "image/jpeg", name: item.file.name, dataUrl }));
        } else {
          attachments.push({ kind: item.kind, mimeType: item.file.type, name: item.file.name, dataUrl: await toDataUrl(item.file) });
        }
      }
      if (attachments.length > 5) throw new Error("Envie no máximo cinco imagens ou quadros de vídeo por mensagem.");
      const r = await send({ data: { consent: prefs?.aiConsent === true, rememberContext: prefs?.rememberAiContext === true, retentionDays: prefs?.retentionDays ?? 0, messages: next.slice(1), attachments } });
      setMsgs([...next, { role: "assistant", content: r.reply }]);
      setDegraded(r.degraded);
      if (r.risk.level !== "none") setRisk((cur) => (cur === "urgent" ? cur : r.risk.level));
      if (r.risk.offerHuman) setOfferHuman(true);
    } catch (error) {
      setMsgs([...next, { role: "assistant", content: error instanceof Error ? error.message : "Não consegui processar sua mensagem agora. Você pode tentar novamente ou falar com um voluntário." }]);
      setDegraded(true); setOfferHuman(true); setRisk((current) => current === "urgent" ? current : localRisk.level !== "none" ? localRisk.level : "attention");
    } finally { setBusy(false); }
  }
  function endSession() { setMsgs([GREETING]); setRisk("none"); setOfferHuman(false); setMedia([]); localStorage.removeItem(AI_HISTORY_KEY); }

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
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl min-w-0 flex-col gap-3 overflow-hidden p-3 sm:p-5">
      <div className="grid shrink-0 grid-cols-3 gap-2">
        <ModeCard icon={Bot} label="Amigo IA" active />
        <ModeCard icon={HeartHandshake} label="Voluntário" to="/conversar" />
        <ModeCard icon={Stethoscope} label="Profissional" to="/apoio" />
      </div>
      <p className="shrink-0 break-words rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">O Amigo IA é uma <strong>inteligência artificial de apoio emocional — não é psicólogo, não possui registro profissional e não realiza psicoterapia</strong>. Usa princípios de comunicação inspirados na Psicanálise, TCC e Terapia Cognitiva Analítica para ajudar você a refletir. Não faz diagnóstico nem substitui atendimento profissional. {prefs?.keepAiHistory ? "Histórico salvo só neste aparelho." : "Sessão temporária: nada é guardado."} A seção de apoio apresenta serviços e redes públicas; não significa que haja psicólogos atendendo dentro do app.</p>

      {offerHuman && !queueId && (
        <div className="min-w-0 shrink-0 break-words rounded-xl border border-primary/30 bg-primary/5 p-3">
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
        <div className="min-w-0 shrink-0 break-words rounded-xl border border-primary/30 bg-primary/5 p-4" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-semibold"><HeartHandshake className="h-4 w-4" /> Você está sendo encaminhado(a) para um voluntário.</p>
          <p className="mt-1 text-xs text-muted-foreground">{queuePosition ? `Sua posição na fila é ${queuePosition}.` : "Os voluntários foram avisados. Assim que alguém aceitar, a conversa será aberta automaticamente."}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void leaveVolunteerQueue()}>Cancelar encaminhamento</Button>
        </div>
      )}

      <AnimatePresence>{(risk !== "none" || offerHuman) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert"
          className={`min-w-0 shrink-0 break-words rounded-lg border p-3 text-sm ${risk === "urgent" ? "border-destructive bg-destructive/10" : "border-primary/40 bg-primary/5"}`}>
          <p className="flex items-center gap-2 font-medium"><ShieldAlert className="h-4 w-4" />{risk === "urgent" ? "Sua segurança vem primeiro. Não fique sozinho(a) agora." : "Uma pessoa pode te acompanhar melhor agora."}</p>
          <p className="mt-2 text-sm">Se você pensa em agir agora, já começou a se machucar ou tomou alguma substância, ligue para o SAMU 192 imediatamente. Se houver perigo imediato ou violência, ligue 190. O CVV 188 oferece apoio emocional gratuito, 24 horas. Peça também a alguém de confiança para ficar com você presencialmente.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" asChild><Link to="/conversar">Falar com voluntário (prioritário)</Link></Button>
            <Button size="sm" variant="outline" asChild><a href="tel:188"><Phone className="mr-1 h-4 w-4" />CVV 188</a></Button>
            <Button size="sm" variant="outline" asChild><a href="tel:192">SAMU 192</a></Button>
            {risk === "urgent" && <Button size="sm" variant="outline" asChild><a href="tel:190">Polícia 190</a></Button>}
          </div>
          {degraded && <p className="mt-2 text-xs text-muted-foreground">A IA está instável no momento, por isso recomendamos o apoio humano.</p>}
        </motion.div>)}</AnimatePresence>

      <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto rounded-xl border bg-card p-3" aria-live="polite">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`min-w-0 max-w-[88%] break-words whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl px-3 py-2 text-sm sm:px-4 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{m.content}</div>
          </motion.div>))}
        {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Amigo IA está preparando uma resposta…</div>}
        <div ref={end} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="ghost" asChild><Link to="/respirar"><Wind className="mr-1 h-4 w-4" />Respirar</Link></Button>
        <Button size="sm" variant="ghost" onClick={endSession}><X className="mr-1 h-4 w-4" />Encerrar conversa</Button>
      </div>
      {mediaError && <p className="text-xs text-destructive" role="alert">{mediaError}</p>}
      {media.length > 0 && <div className="flex flex-wrap gap-2" aria-label="Anexos selecionados">{media.map((item, index) => <div key={`${item.file.name}-${index}`} className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border bg-card px-2 py-1 text-xs"><span className="max-w-32 truncate">{item.file.name}</span><button type="button" aria-label={`Remover ${item.file.name}`} onClick={() => setMedia((current) => current.filter((_, i) => i !== index))}><X className="h-3 w-3" /></button></div>)}</div>}
      <form className="flex min-w-0 items-end gap-2" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <input ref={mediaInput} type="file" accept="image/jpeg,image/png,image/webp,audio/*,video/*" multiple className="hidden" onChange={pickMedia} />
        <Button type="button" size="icon" variant="outline" className="h-auto w-11 shrink-0" disabled={busy || media.length >= 3} onClick={() => mediaInput.current?.click()} aria-label="Anexar foto, áudio ou vídeo"><Paperclip className="h-4 w-4" /></Button>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Escreva o que está sentindo…" aria-label="Mensagem"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); } }} className="w-0 min-w-0 flex-1 resize-none" />
        <Button type="submit" size="icon" className="h-auto w-12 shrink-0" disabled={busy || (!text.trim() && !media.length)} aria-label="Enviar"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

function ModeCard({ icon: Icon, label, active, to }: { icon: typeof Bot; label: string; active?: boolean; to?: "/conversar" | "/apoio" }) {
  const cls = `flex min-w-0 flex-col items-center gap-1 rounded-lg border p-2 text-center text-xs font-medium transition ${active ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`;
  return to ? <Link to={to} className={cls}><Icon className="h-5 w-5" />{label}</Link> : <div className={cls} aria-current="page"><Icon className="h-5 w-5" />{label}</div>;
}
