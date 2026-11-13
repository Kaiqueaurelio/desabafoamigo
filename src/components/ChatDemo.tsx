import { useEffect, useState } from "react";
import { avatarUrl } from "@/lib/avatar";

type Msg = { side: "me" | "peer"; text: string; delay: number };

const SCRIPT: Msg[] = [
  { side: "peer", text: "Oi! Eu sou o Amigo IA. Como você está se sentindo hoje?", delay: 900 },
  { side: "me", text: "Um pouco ansiosa com o trabalho…", delay: 1500 },
  { side: "peer", text: "Estou aqui para te ouvir e ajudar a organizar o que está passando pela sua cabeça. 💙", delay: 1600 },
  { side: "me", text: "Obrigada, isso já me acalma um pouco.", delay: 1500 },
  { side: "peer", text: "Vamos com calma. Quer me contar um pouco mais? 🌿", delay: 1800 },
];

export function ChatDemo() {
  const [visible, setVisible] = useState<number>(0);
  const [typing, setTyping] = useState<"me" | "peer" | null>("peer");

  useEffect(() => {
    let cancelled = false;
    let timers: ReturnType<typeof setTimeout>[] = [];

    const run = () => {
      setVisible(0);
      setTyping(SCRIPT[0].side);
      let acc = 0;
      SCRIPT.forEach((msg, i) => {
        acc += msg.delay;
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setVisible(i + 1);
            const next = SCRIPT[i + 1];
            setTyping(next ? next.side : null);
          }, acc)
        );
      });
      // restart loop
      timers.push(
        setTimeout(() => {
          if (!cancelled) run();
        }, acc + 3200)
      );
    };
    run();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-sky/30 via-brand-green/20 to-brand-sky/30 blur-2xl animate-gradient-shift" />
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-[var(--shadow-calm)] animate-float">
        <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
          <img
            src={avatarUrl("Amigo IA", 96)}
            alt=""
            className="size-11 rounded-full ring-2 ring-brand-soft"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Sereno Rio 428</p>
            <p className="flex items-center gap-1.5 text-[11px] text-brand-green">
              <span className="inline-block size-1.5 rounded-full bg-brand-green animate-pulse" />
              Inteligência artificial · Assistente de apoio
            </p>
          </div>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-primary">
            demonstração
          </span>
        </div>
        <div className="flex min-h-[240px] flex-col justify-end space-y-2">
          {SCRIPT.slice(0, visible).map((m, i) => (
            <Bubble key={`${visible}-${i}`} side={m.side}>
              {m.text}
            </Bubble>
          ))}
          {typing && (
            <div className={`flex ${typing === "me" ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex items-center gap-1 rounded-2xl px-3 py-2 ${
                  typing === "me"
                    ? "bg-chat-user/70 text-chat-user-foreground"
                    : "bg-chat-peer text-chat-peer-foreground"
                }`}
              >
                <span className="size-1.5 animate-bounce rounded-full bg-current/60" />
                <span className="size-1.5 animate-bounce rounded-full bg-current/60 [animation-delay:120ms]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current/60 [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "me" | "peer"; children: React.ReactNode }) {
  const mine = side === "me";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} animate-bubble-in`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          mine
            ? "bg-chat-user text-chat-user-foreground rounded-br-sm"
            : "bg-chat-peer text-chat-peer-foreground rounded-bl-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
