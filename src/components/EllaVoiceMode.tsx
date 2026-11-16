"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertCircle,
  HeartHandshake,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";
import { createLiveVoiceAccess } from "@/lib/liveVoice.functions";
import { assessRisk, type RiskLevel } from "@/lib/aiSafety";

type VoiceMessage = { role: "user" | "assistant"; content: string };
type Caption = { role: "user" | "assistant"; text: string; id: number; startMs: number; endMs: number };
type ActivityState = "idle" | "listening" | "thinking" | "speaking";
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consent: boolean;
  messages: VoiceMessage[];
  onTranscript: (message: VoiceMessage) => void;
  onRisk: (level: "attention" | "urgent") => void;
  onRequestHuman: () => void;
};

export function EllaVoiceMode({
  open,
  onOpenChange,
  consent,
  messages,
  onTranscript,
  onRisk,
  onRequestHuman,
}: Props) {
  const requestAccess = useServerFn(createLiveVoiceAccess);
  const reduceMotion = useReducedMotion();
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [localError, setLocalError] = useState("");
  const [activity, setActivity] = useState<ActivityState>("idle");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [risk, setRisk] = useState<RiskLevel>("none");
  const [usageSeconds, setUsageSeconds] = useState(0);
  const captionId = useRef(0);
  const captionsRef = useRef<Caption[]>([]);
  const riskTextRef = useRef("");
  const committedRef = useRef(true);
  const callbacksRef = useRef({ onTranscript, onRisk });
  captionsRef.current = captions;
  callbacksRef.current = { onTranscript, onRisk };

  function commitTranscript() {
    if (committedRef.current) return;
    committedRef.current = true;
    const turns: VoiceMessage[] = [];
    for (const caption of captionsRef.current) {
      const content = caption.text;
      if (!content) continue;
      const previous = turns.at(-1);
      if (previous?.role === caption.role) previous.content += content;
      else turns.push({ role: caption.role, content });
    }
    for (const turn of turns) {
      if (turn.content.trim()) callbacksRef.current.onTranscript(turn);
    }
  }

  function raiseRisk(level: "attention" | "urgent") {
    setRisk((current) => (current === "urgent" ? current : level));
    callbacksRef.current.onRisk(level);
  }

  function handleLiveEvent(event: LiveEvent) {
    if (event.type === "app.connected") setActivity("listening");
    if (event.type === "app.delegation.pending") setActivity("thinking");
    if (event.type === "app.greeting.error") {
      setLocalError(event.error?.message ?? "A saudação não foi confirmada. Você já pode falar.");
    }
    if (event.type === "app.safety") {
      const level = (event.risk as { level?: unknown } | undefined)?.level;
      if (level === "urgent" || level === "attention") raiseRisk(level);
    }
    if (
      (event.type === "session.usage.updated" || event.type === "session.closed") &&
      typeof event.usage?.seconds === "number"
    ) {
      setUsageSeconds(Math.max(15, event.usage.seconds));
    }
    if (
      event.type !== "session.input_transcript.delta" &&
      event.type !== "session.output_transcript.delta"
    ) {
      if (event.type === "session.output_audio.delta" || event.type === "response.audio.delta") {
        setActivity("speaking");
      }
      if (event.type === "app.closed") {
        setActivity("idle");
        commitTranscript();
      }
      return;
    }
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (!delta) return;
    const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
    setActivity(role === "user" ? "listening" : "speaking");
    const caption: Caption = {
      id: ++captionId.current,
      role,
      text: delta,
      startMs: typeof event.start_ms === "number" ? event.start_ms : 0,
      endMs: typeof event.end_ms === "number" ? event.end_ms : 0,
    };
    setCaptions((current) => [...current.slice(-79), caption]);
    if (role === "user") {
      riskTextRef.current = `${riskTextRef.current} ${delta}`.slice(-6000);
      const assessment = assessRisk(riskTextRef.current, 0);
      if (assessment.level !== "none") raiseRisk(assessment.level);
    }
  }

  const voice = useLiveVoice({ onEvent: handleLiveEvent });
  const canStart = voice.status === "idle" || voice.status === "closed";
  const active = voice.status === "connecting" || voice.status === "connected";

  async function startCall() {
    if (!consent) {
      setLocalError("Autorize o processamento por IA nas configurações de privacidade para começar.");
      return;
    }
    setRequestingAccess(true);
    setLocalError("");
    setCaptions([]);
    captionsRef.current = [];
    riskTextRef.current = "";
    setRisk("none");
    setUsageSeconds(0);
    setActivity("listening");
    committedRef.current = false;
    try {
      const access = await requestAccess({ data: { consent: true } });
      voice.start({
        ticket: access.ticket,
        history: messages.slice(-12).map((message) => ({
          role: message.role,
          content: message.content.slice(0, 1800),
        })),
      });
    } catch (error) {
      committedRef.current = true;
      setActivity("idle");
      setLocalError(error instanceof Error ? error.message : "Não foi possível iniciar a chamada.");
    } finally {
      setRequestingAccess(false);
    }
  }

  function endCall() {
    voice.stop();
    commitTranscript();
    setActivity("idle");
  }

  function changeOpen(next: boolean) {
    if (!next) endCall();
    onOpenChange(next);
  }

  function requestHuman() {
    endCall();
    onOpenChange(false);
    onRequestHuman();
  }

  const groupedCaptions = useMemo(() => {
    const turns: Array<VoiceMessage & { id: number }> = [];
    for (const caption of captions) {
      const previous = turns.at(-1);
      if (previous?.role === caption.role) previous.content += caption.text;
      else turns.push({ id: caption.id, role: caption.role, content: caption.text });
    }
    return turns.slice(-8);
  }, [captions]);

  const statusLabel = requestingAccess
    ? "Preparando uma conexão segura…"
    : voice.status === "connecting"
      ? "Conectando você à Ella…"
      : activity === "thinking"
        ? "Ella está pensando…"
        : activity === "speaking"
          ? "Ella está falando…"
          : active
            ? "Estou ouvindo… pode falar"
            : "Pronta para conversar ao vivo";
  const error = localError || voice.error;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
            Conversa ao vivo com IA
          </div>
          <DialogTitle>Fale com a Ella</DialogTitle>
          <DialogDescription>
            Converse naturalmente. Você pode interromper a resposta e falar quando quiser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          <div className="relative flex h-40 w-40 items-center justify-center" aria-hidden="true">
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/10"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scale: activity === "speaking" ? [1, 1.14, 1] : [1, 1.06, 1],
                      opacity: [0.45, 0.85, 0.45],
                    }
              }
              transition={{ duration: activity === "speaking" ? 1.1 : 2.8, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-5 rounded-full bg-primary/20"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-calm"
              animate={
                reduceMotion
                  ? undefined
                  : { scale: activity === "speaking" ? [1, 1.07, 1] : activity === "thinking" ? [1, 0.96, 1] : 1 }
              }
              transition={{ duration: 0.9, repeat: activity === "idle" ? 0 : Infinity }}
            >
              {requestingAccess || voice.status === "connecting" || activity === "thinking" ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : activity === "speaking" ? (
                <Volume2 className="h-10 w-10" />
              ) : active ? (
                <Mic className="h-10 w-10" />
              ) : (
                <Activity className="h-10 w-10" />
              )}
            </motion.div>
          </div>

          <p className="text-center font-semibold" role="status" aria-live="polite">
            {statusLabel}
          </p>

          <div className="min-h-28 w-full space-y-2 rounded-xl bg-muted p-3" aria-live="polite">
            {groupedCaptions.length ? (
              groupedCaptions.map((caption) => (
                <p
                  key={caption.id}
                  className={`text-sm ${caption.role === "user" ? "text-right text-foreground" : "text-left text-muted-foreground"}`}
                >
                  <span className="mr-1 text-xs font-semibold">
                    {caption.role === "user" ? "Você" : "Ella"}:
                  </span>
                  {caption.content}
                </p>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {active ? "Sua fala e a resposta da Ella aparecerão aqui." : "Toque em iniciar e permita o microfone."}
              </p>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="flex w-full items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {risk !== "none" && (
            <div
              role="alert"
              className={`w-full rounded-xl border p-3 text-sm ${risk === "urgent" ? "border-destructive bg-destructive/10" : "border-primary/40 bg-primary/5"}`}
            >
              <p className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="h-4 w-4" />
                {risk === "urgent" ? "Sua segurança vem primeiro." : "Apoio humano pode ajudar agora."}
              </p>
              <p className="mt-2 text-muted-foreground">
                Não fique sozinho(a). Procure alguém de confiança. Em emergência médica, ligue 192; em perigo imediato, 190.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href="tel:188"><Phone className="mr-1 h-4 w-4" />CVV 188</a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href="tel:192">SAMU 192</a>
                </Button>
              </div>
            </div>
          )}

          {voice.playbackBlocked && (
            <Button variant="outline" onClick={voice.resumePlayback}>
              <Volume2 className="mr-2 h-4 w-4" />
              Ouvir a Ella
            </Button>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {canStart ? (
              <Button onClick={() => void startCall()} disabled={!consent || requestingAccess}>
                {requestingAccess ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                {voice.status === "closed" ? "Iniciar nova conversa" : "Iniciar conversa ao vivo"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => voice.setMuted(!voice.muted)}
                  disabled={voice.status !== "connected"}
                  aria-label={voice.muted ? "Ativar microfone" : "Silenciar microfone"}
                >
                  {voice.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button variant="destructive" onClick={endCall} disabled={voice.status === "stopping"}>
                  <PhoneOff className="mr-2 h-4 w-4" />
                  Encerrar
                </Button>
              </>
            )}
            <Button variant="outline" onClick={requestHuman}>
              <HeartHandshake className="mr-2 h-4 w-4" />
              Falar com voluntário
            </Button>
          </div>

          <audio ref={voice.audioRef} controls className="h-0 w-0 opacity-0" aria-label="Áudio da Ella" />
          <p className="text-center text-xs text-muted-foreground">
            Ella é uma IA de apoio emocional e não substitui ajuda profissional ou de emergência.
            O microfone é desligado ao encerrar. {usageSeconds > 0 ? `Tempo de voz registrado: ${Math.round(usageSeconds)}s.` : ""}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
