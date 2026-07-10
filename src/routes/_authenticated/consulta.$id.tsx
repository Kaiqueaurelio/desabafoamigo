import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, Paperclip, Mic, StopCircle, FileText, Image as ImageIcon, Music, CheckCircle2, Video, Languages, AudioLines, Sparkles } from "lucide-react";
import { Watermark, IdentityWatermark } from "@/components/Watermark";
import { ScreenshotGuard } from "@/components/ScreenshotGuard";
import { detectRisk } from "@/lib/riskWords";
import { RiskAlert } from "@/components/RiskAlert";
import { ReportButton } from "@/components/ReportDialog";
import { RatingDialog } from "@/components/RatingDialog";
import { getSessionForensicHash } from "@/lib/sessionForensic";
import { useServerFn } from "@tanstack/react-start";
import { transcribeMessage, translateMessage, summarizeConversation } from "@/lib/ai.functions";
import { SyncedAudioPlayer, type CaptionSegment } from "@/components/SyncedAudioPlayer";

export const Route = createFileRoute("/_authenticated/consulta/$id")({
  component: Consulta,
});

type Appt = {
  id: string; patient_id: string; professional_id: string;
  scheduled_at: string; topic: string; status: string;
  professional_notes: string | null; conversation_id: string | null;
};
type Message = {
  id: string; conversation_id: string; sender_id: string;
  content: string | null; attachment_id: string | null; created_at: string; read_at: string | null;
  transcription?: string | null; translations?: Record<string, string> | null;
  segments?: CaptionSegment[] | null;
  translation_segments?: Record<string, CaptionSegment[]> | null;
};
type Attachment = {
  id: string; storage_path: string; mime_type: string; size_bytes: number;
  kind: "pdf"|"image"|"audio"|"video"; original_name: string | null; sender_id: string;
};

const MAX = { pdf: 10 * 1024 * 1024, image: 5 * 1024 * 1024, audio: 10 * 1024 * 1024, video: 30 * 1024 * 1024 };
const LANGS: { code: string; label: string }[] = [
  { code: "pt-BR", label: "Português (BR)" }, { code: "en", label: "English" }, { code: "es", label: "Español" },
  { code: "fr", label: "Français" }, { code: "de", label: "Deutsch" }, { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" }, { code: "zh", label: "中文" }, { code: "ar", label: "العربية" },
];

function Consulta() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [myAlias, setMyAlias] = useState<string>("Você");
  const [appt, setAppt] = useState<Appt | null>(null);
  const [peer, setPeer] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachments, setAttachments] = useState<Record<string, Attachment>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [askRating, setAskRating] = useState(false);
  const [askSummary, setAskSummary] = useState(false);
  const [peerSummary, setPeerSummary] = useState<{ summary: string; technical_details: string; sessions_count: number } | null>(null);
  const [targetLang, setTargetLang] = useState<string>("en");
  const [captionVisibility, setCaptionVisibility] = useState<Record<string, Set<string>>>({});
  function toggleCaption(msgId: string, lang: string) {
    setCaptionVisibility((prev) => {
      const set = new Set(prev[msgId] ?? []);
      if (set.has(lang)) set.delete(lang); else set.add(lang);
      return { ...prev, [msgId]: set };
    });
  }
  function isCaptionVisible(msgId: string, lang: string) {
    const set = captionVisibility[msgId];
    return set ? set.has(lang) : true; // default visible when available
  }
  const doTranscribe = useServerFn(transcribeMessage);
  const doTranslate = useServerFn(translateMessage);
  const riskDetected = draft.length > 6 && detectRisk(draft);
  const riskInHistory = messages.some((m) => m.content && detectRisk(m.content));
  const forensicHash = useMemo(() => (me ? getSessionForensicHash(me) : ""), [me]);

  const isPro = appt && me === appt.professional_id;

  useEffect(() => {
    let cancelled = false;
    let mChan: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);
      const { data: myProf } = await supabase.from("profiles").select("display_name").eq("user_id", u.user.id).maybeSingle();
      if (myProf?.display_name) setMyAlias(myProf.display_name);

      const { data: a } = await supabase.from("appointments").select("*").eq("id", id).maybeSingle();
      if (!a || cancelled) return;
      setAppt(a as Appt);
      setNotesDraft(a.professional_notes ?? "");

      const peerId = a.patient_id === u.user.id ? a.professional_id : a.patient_id;
      const { data: peerVol } = await supabase.from("volunteers").select("full_name, specialty").eq("user_id", peerId).maybeSingle();
      if (peerVol) setPeer(`${peerVol.full_name}${peerVol.specialty ? " · " + peerVol.specialty : ""}`);
      else {
        const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", peerId).maybeSingle();
        setPeer(prof?.display_name ?? "Amigo(a)");
      }

      if (!a.conversation_id) return;

      // If I'm the volunteer, load returning-user summary
      if (a.professional_id === u.user.id) {
        const { data: sum } = await supabase.from("user_summaries")
          .select("summary, technical_details, sessions_count").eq("user_id", a.patient_id).maybeSingle();
        if (sum) setPeerSummary(sum);
      }

      const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", a.conversation_id).order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);
      await loadAttachments((msgs ?? []) as Message[]);

      // mark in_progress if scheduled and time has come
      if (a.status === "scheduled" && new Date(a.scheduled_at) <= new Date()) {
        await supabase.from("appointments").update({ status: "in_progress" }).eq("id", a.id);
      }

      mChan = supabase.channel(`conv-${a.conversation_id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${a.conversation_id}` },
          async (p) => {
            const nm = p.new as Message;
            setMessages((prev) => [...prev, nm]);
            if (nm.attachment_id) await loadAttachments([nm]);
          })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${a.conversation_id}` },
          (p) => setMessages((prev) => prev.map((m) => m.id === (p.new as Message).id ? (p.new as Message) : m)))
        .subscribe();
    })();

    return () => { cancelled = true; if (mChan) supabase.removeChannel(mChan); };
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  useEffect(() => {
    if (!me) return;
    const unread = messages.filter((m) => m.sender_id !== me && !m.read_at).map((m) => m.id);
    if (unread.length) supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread).then(() => {});
  }, [messages, me]);

  async function loadAttachments(msgs: Message[]) {
    const ids = msgs.filter((m) => m.attachment_id).map((m) => m.attachment_id!) as string[];
    if (!ids.length) return;
    const { data: atts } = await supabase.from("attachments").select("*").in("id", ids);
    if (!atts) return;
    setAttachments((prev) => {
      const next = { ...prev };
      atts.forEach((a) => { next[a.id] = a as Attachment; });
      return next;
    });
    // signed URLs
    for (const a of atts) {
      const { data: signed } = await supabase.storage.from("consultation-files").createSignedUrl(a.storage_path, 600);
      if (signed?.signedUrl) setUrls((u) => ({ ...u, [a.id]: signed.signedUrl }));
    }
  }

  async function send() {
    const content = draft.trim();
    if (!content || sending || !me || !appt?.conversation_id) return;
    setSending(true); setDraft("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: appt.conversation_id, sender_id: me, content,
    });
    if (error) { setDraft(content); console.error(error); }
    setSending(false);
  }

  async function uploadFile(file: File) {
    if (!me || !appt?.conversation_id) return;
    const kind: Attachment["kind"] = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : file.type === "application/pdf" ? "pdf" : (() => { throw new Error("Tipo não suportado (PDF, imagem, vídeo ou áudio)"); })();
    if (file.size > MAX[kind]) throw new Error(`Arquivo muito grande. Máx ${MAX[kind] / 1024 / 1024}MB`);
    const path = `${appt.conversation_id}/${me}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("consultation-files").upload(path, file, { contentType: file.type });
    if (upErr) throw upErr;
    const { data: att, error: aErr } = await supabase.from("attachments").insert({
      conversation_id: appt.conversation_id, sender_id: me, storage_path: path,
      mime_type: file.type, size_bytes: file.size, kind, original_name: file.name,
    }).select("id").single();
    if (aErr) throw aErr;
    await supabase.from("messages").insert({
      conversation_id: appt.conversation_id, sender_id: me, attachment_id: att.id, content: null,
    });
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    try { await uploadFile(file); } catch (err) { alert(err instanceof Error ? err.message : "Erro"); }
  }

  async function toggleRecord() {
    if (recording) { mediaRef.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
        try { await uploadFile(file); } catch (err) { alert(err instanceof Error ? err.message : "Erro"); }
      };
      rec.start();
      mediaRef.current = rec;
      setRecording(true);
    } catch { alert("Não foi possível acessar o microfone."); }
  }

  async function finish() {
    if (!appt) return;
    if (!confirm("Encerrar a conversa? Ela ficará finalizada.")) return;
    await supabase.from("appointments").update({ status: "completed", professional_notes: notesDraft }).eq("id", appt.id);
    if (appt.conversation_id) await supabase.from("conversations").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", appt.conversation_id);
    if (isPro) { setAskSummary(true); return; }
    setAskRating(true);
  }

  async function transcribe(messageId: string) {
    try {
      const r = await doTranscribe({ data: { messageId } });
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, transcription: r.text, segments: r.segments } : m));
    } catch (e) { alert(e instanceof Error ? e.message : "Erro"); }
  }

  async function translate(messageId: string) {
    try {
      const r = await doTranslate({ data: { messageId, targetLang } });
      setMessages((prev) => prev.map((m) => m.id === messageId ? {
        ...m,
        translations: { ...(m.translations ?? {}), [targetLang]: r.text },
        translation_segments: { ...(m.translation_segments ?? {}), [targetLang]: r.segments },
      } : m));
    } catch (e) { alert(e instanceof Error ? e.message : "Erro"); }
  }

  async function saveNotes() {
    if (!appt) return;
    await supabase.from("appointments").update({ professional_notes: notesDraft }).eq("id", appt.id);
    alert("Notas salvas.");
  }

  if (!appt) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  return (
    <ScreenshotGuard
      onAttempt={(attempt) => {
        if (!appt || !me) return;
        void supabase.from("screenshot_incidents").insert({
          user_id: me,
          appointment_id: appt.id,
          conversation_id: appt.conversation_id,
          reason: attempt.reason,
          severity: attempt.severity,
          user_agent: attempt.userAgent,
        }).then(() => {}, () => {});
      }}
    >
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to={isPro ? "/pro" : "/consultas"} aria-label="Voltar" className="rounded-full p-2 text-muted-foreground hover:bg-muted">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <p className="text-sm font-semibold text-foreground">{peer}</p>
            <p className="text-[11px] text-muted-foreground">{appt.topic} · {new Date(appt.scheduled_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isPro && <ReportButton appointmentId={appt.id} reportedUserId={appt.professional_id} />}
          {appt.status !== "completed" && appt.status !== "cancelled" && (
            <button onClick={finish} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-muted">
              <CheckCircle2 className="size-3.5" /> Finalizar
            </button>
          )}
        </div>
      </header>
      {(riskDetected || riskInHistory) && <RiskAlert />}

      {isPro && peerSummary && (peerSummary.summary || peerSummary.technical_details) && (
        <div className="border-b border-border bg-brand-soft/40 px-4 py-2 text-xs text-foreground">
          <p className="font-semibold text-primary">🌱 Retornante · {peerSummary.sessions_count} conversa(s) anterior(es)</p>
          {peerSummary.summary && <p className="mt-1">{peerSummary.summary}</p>}
          {peerSummary.technical_details && <details className="mt-1"><summary className="cursor-pointer text-muted-foreground">Detalhes técnicos</summary><pre className="mt-1 whitespace-pre-wrap font-sans text-[11px] text-muted-foreground">{peerSummary.technical_details}</pre></details>}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col">
          <div className="relative flex-1 overflow-y-auto">
            <Watermark />
            <IdentityWatermark label={myAlias} sessionHash={me ? forensicHash : undefined} />
            <div className="relative z-10 space-y-2 px-4 py-4">
            {messages.length === 0 && (
              <p className="mx-auto max-w-md rounded-2xl bg-brand-soft px-4 py-3 text-center text-sm text-muted-foreground">
                Você está em um espaço seguro de escuta acolhedora. Escreva no seu tempo.
              </p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === me;
              const att = m.attachment_id ? attachments[m.attachment_id] : null;
              const isAudioAtt = !!att && att.kind === "audio";
              const isMedia = !!att && (att.kind === "audio" || att.kind === "video");
              const canTranscribe = isMedia && !m.transcription;
              const langsAvailable = Object.keys(m.translations ?? {});
              const canTranslate = (m.content || m.transcription) && !(m.translations?.[targetLang]);
              const showOriginal = isCaptionVisible(m.id, "__original");
              const origSegs = (m.segments ?? []) as CaptionSegment[];
              const trSegsMap = m.translation_segments ?? {};
              const hasTimedOriginal = origSegs.length > 0;
              const visibleLangs = new Set<string>();
              if (showOriginal) visibleLangs.add("__original");
              langsAvailable.forEach((l) => { if (isCaptionVisible(m.id, l)) visibleLangs.add(l); });
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-chat-user text-chat-user-foreground rounded-br-sm" : "bg-chat-peer text-chat-peer-foreground rounded-bl-sm"}`}>
                    {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                    {att && !isAudioAtt && <AttachmentView att={att} url={urls[att.id]} />}
                    {isAudioAtt && urls[att.id] && (
                      <SyncedAudioPlayer
                        src={urls[att.id]}
                        original={m.transcription ? { lang: "__original", label: "Transcrição", segments: origSegs } : undefined}
                        tracks={langsAvailable.map((lang) => ({
                          lang,
                          label: LANGS.find((l) => l.code === lang)?.label ?? lang,
                          segments: (trSegsMap[lang] ?? []) as CaptionSegment[],
                        }))}
                        visibleLangs={visibleLangs}
                      />
                    )}
                    {/* Untimed fallback captions (non-audio messages or audio without segments) */}
                    {!hasTimedOriginal && m.transcription && showOriginal && (
                      <p className="mt-2 rounded-lg bg-background/30 px-2 py-1 text-[12px] italic">
                        <AudioLines className="mr-1 inline size-3" />{m.transcription}
                      </p>
                    )}
                    {langsAvailable.map((lang) => {
                      if (!isCaptionVisible(m.id, lang)) return null;
                      const hasTimedTr = (trSegsMap[lang]?.length ?? 0) > 0;
                      if (isAudioAtt && hasTimedTr) return null; // rendered by SyncedAudioPlayer
                      const label = LANGS.find((l) => l.code === lang)?.label ?? lang;
                      return (
                        <p key={lang} className="mt-1 rounded-lg bg-background/30 px-2 py-1 text-[12px]">
                          <Languages className="mr-1 inline size-3" />
                          <span className="mr-1 text-[10px] opacity-70">{label}</span>
                          {m.translations?.[lang]}
                        </p>
                      );
                    })}
                    {(m.transcription || langsAvailable.length > 0) && (
                      <div className={`mt-1 flex flex-wrap gap-1 text-[10px] ${mine ? "text-chat-user-foreground/80" : "text-chat-peer-foreground/70"}`}>
                        {m.transcription && (
                          <button onClick={() => toggleCaption(m.id, "__original")} className="rounded-full bg-background/40 px-2 py-0.5 hover:bg-background/70">
                            {showOriginal ? "Ocultar" : "Mostrar"} original
                          </button>
                        )}
                        {langsAvailable.map((lang) => {
                          const label = LANGS.find((l) => l.code === lang)?.label ?? lang;
                          const on = isCaptionVisible(m.id, lang);
                          return (
                            <button key={lang} onClick={() => toggleCaption(m.id, lang)} className="rounded-full bg-background/40 px-2 py-0.5 hover:bg-background/70">
                              {on ? "Ocultar" : "Mostrar"} {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] ${mine ? "text-chat-user-foreground/80" : "text-chat-peer-foreground/70"}`}>
                      <time>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                      {mine && <span>· {m.read_at ? "lida" : "enviada"}</span>}
                      {canTranscribe && <button onClick={() => transcribe(m.id)} className="inline-flex items-center gap-0.5 rounded-full bg-background/40 px-2 py-0.5 hover:bg-background/70"><AudioLines className="size-3" /> transcrever</button>}
                      {canTranslate && <button onClick={() => translate(m.id)} className="inline-flex items-center gap-0.5 rounded-full bg-background/40 px-2 py-0.5 hover:bg-background/70"><Languages className="size-3" /> traduzir p/ {LANGS.find(l=>l.code===targetLang)?.label ?? targetLang}</button>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
            </div>
          </div>

          {appt.status !== "completed" && appt.status !== "cancelled" ? (
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-border bg-card px-3 py-3">
              <div className="mb-2 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
                <Languages className="size-3.5" /> Idioma p/ tradução:
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="rounded border border-border bg-background px-1 py-0.5 text-[11px]">
                  {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <input type="file" ref={fileRef} onChange={onPickFile} className="hidden" accept="application/pdf,image/*,audio/*,video/*" />
                <button type="button" onClick={() => fileRef.current?.click()} aria-label="Anexar" className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground hover:bg-muted">
                  <Paperclip className="size-5" />
                </button>
                <button type="button" onClick={toggleRecord} aria-label="Áudio" className={`grid size-11 shrink-0 place-items-center rounded-full ${recording ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>
                  {recording ? <StopCircle className="size-5" /> : <Mic className="size-5" />}
                </button>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1} maxLength={2000} placeholder="Escreva sua mensagem..."
                  className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary" />
                <button type="submit" disabled={!draft.trim() || sending} aria-label="Enviar"
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
                  <Send className="size-5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="border-t border-border bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
              Conversa finalizada. O histórico continua disponível.
            </div>
          )}
        </section>

        {isPro && (
          <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-card p-4 lg:flex">
            <h3 className="text-sm font-semibold text-primary">Notas privadas</h3>
            <p className="mt-1 text-xs text-muted-foreground">Somente você vê estas anotações da conversa.</p>
            <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)}
              rows={12}
              className="mt-3 flex-1 resize-none rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
            <button onClick={saveNotes} className="btn-primary mt-3 text-sm">Salvar notas</button>
          </aside>
        )}
      </div>
      {askRating && <RatingDialog appointmentId={appt.id} onDone={() => navigate({ to: "/consultas" })} />}
      {askSummary && appt && <SummaryDialog appt={appt} onDone={() => { setAskSummary(false); navigate({ to: "/pro" }); }} />}
    </div>
    </ScreenshotGuard>
  );
}

function AttachmentView({ att, url }: { att: Attachment; url?: string }) {
  if (att.kind === "image") return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={att.original_name ?? ""} className="mt-1 max-h-64 rounded-lg" /></a> : <span>Carregando...</span>;
  if (att.kind === "video") return url ? <video controls src={url} className="mt-1 max-h-64 rounded-lg" /> : <span>Carregando...</span>;
  if (att.kind === "audio") return url ? <audio controls src={url} className="mt-1 max-w-[240px]" /> : <span>Carregando...</span>;
  const Icon = att.kind === "pdf" ? FileText : att.mime_type.startsWith("image/") ? ImageIcon : Music;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-lg bg-background/40 px-3 py-2 text-xs">
      <Icon className="size-4" /> <span className="truncate">{att.original_name ?? "Arquivo"}</span>
    </a>
  );
}

function SummaryDialog({ appt, onDone }: { appt: Appt; onDone: () => void }) {
  const summarize = useServerFn(summarizeConversation);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [technical, setTechnical] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!appt.conversation_id) { onDone(); return; }
      try {
        const r = await summarize({ data: { conversationId: appt.conversation_id } });
        setSummary(r.summary); setTechnical(r.technical);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setSaving(true);
    const { data: existing } = await supabase.from("user_summaries").select("sessions_count").eq("user_id", appt.patient_id).maybeSingle();
    if (existing) {
      await supabase.from("user_summaries").update({
        summary, technical_details: technical, sessions_count: (existing.sessions_count ?? 0) + 1, last_conversation_id: appt.conversation_id,
      }).eq("user_id", appt.patient_id);
    } else {
      await supabase.from("user_summaries").insert({
        user_id: appt.patient_id, summary, technical_details: technical, sessions_count: 1, last_conversation_id: appt.conversation_id,
      });
    }
    setSaving(false); onDone();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl">
        <div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" /><h3 className="text-lg font-semibold">Resumo da conversa</h3></div>
        <p className="mt-1 text-xs text-muted-foreground">Salve um resumo para acolher a mesma pessoa em conversas futuras. Ela permanece anônima.</p>
        {loading ? <p className="mt-4 text-sm text-muted-foreground">Gerando resumo com IA...</p> : (
          <>
            <label className="mt-4 block text-xs font-medium text-muted-foreground">Resumo acolhedor</label>
            <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" />
            <label className="mt-3 block text-xs font-medium text-muted-foreground">Detalhes técnicos (temas/gatilhos)</label>
            <textarea rows={4} value={technical} onChange={(e) => setTechnical(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm" />
          </>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onDone} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Pular</button>
          <button onClick={save} disabled={loading || saving} className="btn-primary text-sm">{saving ? "Salvando..." : "Salvar e sair"}</button>
        </div>
      </div>
    </div>
  );
}
