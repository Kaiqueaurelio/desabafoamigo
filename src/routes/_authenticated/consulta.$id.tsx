import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, Paperclip, Mic, StopCircle, FileText, Image as ImageIcon, Music, CheckCircle2 } from "lucide-react";
import { Watermark } from "@/components/Watermark";

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
};
type Attachment = {
  id: string; storage_path: string; mime_type: string; size_bytes: number;
  kind: "pdf"|"image"|"audio"; original_name: string | null; sender_id: string;
};

const MAX = { pdf: 10 * 1024 * 1024, image: 5 * 1024 * 1024, audio: 10 * 1024 * 1024 };

function Consulta() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
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

  const isPro = appt && me === appt.professional_id;

  useEffect(() => {
    let cancelled = false;
    let mChan: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);

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
    const kind: Attachment["kind"] = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type === "application/pdf" ? "pdf" : (() => { throw new Error("Tipo não suportado (PDF, imagem ou áudio)"); })();
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
    if (!confirm("Marcar conversa como finalizada?")) return;
    await supabase.from("appointments").update({ status: "completed", professional_notes: notesDraft }).eq("id", appt.id);
    if (appt.conversation_id) await supabase.from("conversations").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", appt.conversation_id);
    navigate({ to: isPro ? "/pro" : "/consultas" });
  }

  async function saveNotes() {
    if (!appt) return;
    await supabase.from("appointments").update({ professional_notes: notesDraft }).eq("id", appt.id);
    alert("Notas salvas.");
  }

  if (!appt) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  return (
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
        {appt.status !== "completed" && appt.status !== "cancelled" && (
          <button onClick={finish} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-muted">
            <CheckCircle2 className="size-3.5" /> Finalizar
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <section className="flex flex-1 flex-col">
          <div className="relative flex-1 overflow-y-auto">
            <Watermark />
            <div className="relative z-10 space-y-2 px-4 py-4">
            {messages.length === 0 && (
              <p className="mx-auto max-w-md rounded-2xl bg-brand-soft px-4 py-3 text-center text-sm text-muted-foreground">
                Você está em um espaço seguro de escuta acolhedora. Escreva no seu tempo.
              </p>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === me;
              const att = m.attachment_id ? attachments[m.attachment_id] : null;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-chat-user text-chat-user-foreground rounded-br-sm" : "bg-chat-peer text-chat-peer-foreground rounded-bl-sm"}`}>
                    {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                    {att && <AttachmentView att={att} url={urls[att.id]} />}
                    <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-chat-user-foreground/70" : "text-chat-peer-foreground/60"}`}>
                      <time>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                      {mine && <span>· {m.read_at ? "lida" : "enviada"}</span>}
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
              <div className="flex items-end gap-2">
                <input type="file" ref={fileRef} onChange={onPickFile} className="hidden" accept="application/pdf,image/*,audio/*" />
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
    </div>
  );
}

function AttachmentView({ att, url }: { att: Attachment; url?: string }) {
  if (att.kind === "image") return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={att.original_name ?? ""} className="mt-1 max-h-64 rounded-lg" /></a> : <span>Carregando...</span>;
  if (att.kind === "audio") return url ? <audio controls src={url} className="mt-1 max-w-[240px]" /> : <span>Carregando...</span>;
  const Icon = att.kind === "pdf" ? FileText : att.mime_type.startsWith("image/") ? ImageIcon : Music;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-lg bg-background/40 px-3 py-2 text-xs">
      <Icon className="size-4" /> <span className="truncate">{att.original_name ?? "Arquivo"}</span>
    </a>
  );
}
