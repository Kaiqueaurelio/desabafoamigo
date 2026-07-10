import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAnonymousSession } from "@/lib/anon-session";
import { EmergencyButton } from "@/components/EmergencyButton";
import { Send, ArrowLeft, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/chat/$id")({
  component: ChatPage,
});

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type Conversation = {
  id: string;
  user_id: string;
  volunteer_id: string;
  user_alias: string;
  volunteer_alias: string;
  status: "active" | "ended";
};

function ChatPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let msgChannel: ReturnType<typeof supabase.channel> | null = null;
    let convChannel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const session = await ensureAnonymousSession();
      if (!session || cancelled) return;
      setMe(session.user.id);

      const { data: c } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!c || cancelled) return;
      setConv(c as Conversation);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages((msgs ?? []) as Message[]);

      msgChannel = supabase
        .channel(`msgs-${id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
          (payload) => setMessages((prev) => [...prev, payload.new as Message]),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
          (payload) => setMessages((prev) => prev.map((m) => m.id === (payload.new as Message).id ? (payload.new as Message) : m)),
        )
        .subscribe();

      convChannel = supabase
        .channel(`conv-${id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${id}` },
          (payload) => {
            const next = payload.new as Conversation;
            setConv(next);
            if (next.status === "ended") navigate({ to: "/encerrada" });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (msgChannel) supabase.removeChannel(msgChannel);
      if (convChannel) supabase.removeChannel(convChannel);
    };
  }, [id, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark incoming messages as read
  useEffect(() => {
    if (!me) return;
    const unread = messages.filter((m) => m.sender_id !== me && !m.read_at).map((m) => m.id);
    if (unread.length === 0) return;
    supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread).then(() => {});
  }, [messages, me]);

  async function send() {
    const content = draft.trim();
    if (!content || sending || !me) return;
    setSending(true);
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: me,
      content,
    });
    if (error) {
      console.error(error);
      setDraft(content);
    }
    setSending(false);
  }

  async function endConversation() {
    if (!conv) return;
    if (!confirm("Encerrar a conversa? Todo o histórico será apagado.")) return;
    await supabase.from("conversations").update({ status: "ended" }).eq("id", id);
    await supabase.from("metrics").insert({ event: "conversation_ended" });
    navigate({ to: "/encerrada" });
  }

  const peerAlias = conv ? (me === conv.user_id ? conv.volunteer_alias : conv.user_alias) : "…";
  const isVolunteer = conv && me === conv.volunteer_id;

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => (isVolunteer ? navigate({ to: "/voluntario" }) : navigate({ to: "/" }))}
          aria-label="Voltar"
          className="rounded-full p-2 text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-foreground">{peerAlias}</span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ShieldCheck className="size-3 text-brand-green" /> conversa efêmera
          </span>
        </div>
        <button
          onClick={endConversation}
          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-muted"
        >
          Encerrar
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="mx-auto max-w-sm rounded-2xl bg-brand-soft px-4 py-3 text-center text-sm text-muted-foreground">
            Diga olá 💙. Você está em um espaço seguro. Nada do que for dito aqui será salvo depois que a conversa terminar.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                  mine
                    ? "bg-chat-user text-chat-user-foreground rounded-br-sm"
                    : "bg-chat-peer text-chat-peer-foreground rounded-bl-sm"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
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

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="sticky bottom-0 border-t border-border bg-card px-3 py-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Escreva com calma…"
            aria-label="Mensagem"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Enviar"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:brightness-110 disabled:opacity-50"
          >
            <Send className="size-5" />
          </button>
        </div>
      </form>
      <EmergencyButton />
    </main>
  );
}
