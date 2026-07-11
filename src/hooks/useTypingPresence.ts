import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Payload = { user_id: string; typing: boolean; at: number };

/**
 * Indicador "digitando..." em tempo real via canal broadcast do Supabase.
 * Retorna { peerTyping, notifyTyping } — chame notifyTyping(true) a cada keystroke.
 */
export function useTypingPresence(conversationId: string | null, meId: string | null) {
  const [peerTyping, setPeerTyping] = useState(false);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttle = useRef<number>(0);

  useEffect(() => {
    if (!conversationId || !meId) return;
    const ch = supabase.channel(`typing:${conversationId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as Payload;
        if (p.user_id === meId) return;
        setPeerTyping(p.typing);
        if (p.typing) {
          if (stopTimer.current) clearTimeout(stopTimer.current);
          stopTimer.current = setTimeout(() => setPeerTyping(false), 3500);
        }
      })
      .subscribe();
    chRef.current = ch;
    return () => { supabase.removeChannel(ch); chRef.current = null; setPeerTyping(false); };
  }, [conversationId, meId]);

  function notifyTyping(typing: boolean) {
    if (!chRef.current || !meId) return;
    const now = Date.now();
    if (typing && now - throttle.current < 1500) return;
    throttle.current = now;
    chRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: meId, typing, at: now } });
  }

  return { peerTyping, notifyTyping };
}
