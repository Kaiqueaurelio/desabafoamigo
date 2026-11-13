"use client";

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Mic, MicOff, PhoneOff, Volume2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { aiChat } from "@/lib/aiChat.functions";
import { synthesizeEllaSpeech } from "@/lib/voice.functions";

type VoiceMessage = { role: "user" | "assistant"; content: string };
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consent: boolean;
  messages: VoiceMessage[];
  onTranscript: (message: VoiceMessage) => void;
  onRisk: (level: "attention" | "urgent") => void;
};
type VoiceStatus = "idle" | "connecting" | "listening" | "speaking" | "error";
type SpeechResult = { isFinal: boolean; 0?: { transcript?: string } };
type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function EllaVoiceMode({ open, onOpenChange, consent, messages, onTranscript, onRisk }: Props) {
  const send = useServerFn(aiChat);
  const speak = useServerFn(synthesizeEllaSpeech);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [lastText, setLastText] = useState("Toque em iniciar para conversar com a Ella.");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const messagesRef = useRef(messages);
  const callbacksRef = useRef({ onTranscript, onRisk });
  messagesRef.current = messages;
  callbacksRef.current = { onTranscript, onRisk };

  function stop() {
    activeRef.current = false;
    busyRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setMuted(false);
    setStatus("idle");
  }

  function startListening() {
    if (!activeRef.current || busyRef.current) return;
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Este navegador não oferece reconhecimento de voz. Use Chrome ou Edge atualizado.");
      setStatus("error");
      return;
    }
    const recognition = new Constructor();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const result = Array.from(event.results).find((item) => item.isFinal);
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript) void processTurn(transcript);
    };
    recognition.onerror = (event) => {
      if (!activeRef.current || event.error === "aborted" || event.error === "no-speech") return;
      setError(event.error === "not-allowed" ? "Permita o acesso ao microfone para conversar." : "O reconhecimento de voz foi interrompido. Tente novamente.");
      setStatus("error");
    };
    recognition.onend = () => {
      if (activeRef.current && !busyRef.current) window.setTimeout(() => startListening(), 250);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setStatus("listening");
      setError("");
    } catch {
      setError("Não foi possível iniciar o microfone. Tente novamente.");
      setStatus("error");
    }
  }

  async function processTurn(transcript: string) {
    if (busyRef.current || !activeRef.current) return;
    busyRef.current = true;
    recognitionRef.current?.stop();
    setStatus("connecting");
    setLastText(transcript);
    callbacksRef.current.onTranscript({ role: "user", content: transcript });
    const nextMessages = [...messagesRef.current, { role: "user" as const, content: transcript }].slice(-16);
    try {
      const result = await send({ data: { consent: true, rememberContext: false, retentionDays: 7, messages: nextMessages, attachments: [] } });
      callbacksRef.current.onTranscript({ role: "assistant", content: result.reply });
      if (result.risk?.level === "urgent" || result.risk?.level === "attention") callbacksRef.current.onRisk(result.risk.level);
      setLastText(result.reply);
      const audioResult = await speak({ data: { consent: true, text: result.reply } });
      if (!activeRef.current) return;
      const audio = new Audio(`data:${audioResult.mimeType};base64,${audioResult.audioBase64}`);
      audioRef.current = audio;
      setStatus("speaking");
      audio.onended = () => {
        audioRef.current = null;
        busyRef.current = false;
        if (activeRef.current) startListening();
      };
      audio.onerror = () => {
        setError("Não foi possível reproduzir o áudio gerado pela NVIDIA. Você ainda pode continuar por texto.");
        audioRef.current = null;
        busyRef.current = false;
        if (activeRef.current) startListening();
      };
      await audio.play();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Falha na conversa por voz.";
      setError(message);
      setStatus("error");
      busyRef.current = false;
      if (activeRef.current) startListening();
    }
  }

  function start() {
    if (!consent) {
      setError("É necessário consentir com o processamento de mensagens por IA nas configurações de privacidade.");
      setStatus("error");
      return;
    }
    setError("");
    activeRef.current = true;
    busyRef.current = false;
    startListening();
  }

  function toggleMute() {
    if (muted) {
      setMuted(false);
      startListening();
    } else {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setMuted(true);
      setStatus("idle");
    }
  }

  useEffect(() => {
    if (!open) stop();
    return () => stop();
  }, [open]);

  const statusLabel = status === "connecting" ? "Ella está pensando..." : status === "speaking" ? "Ella está falando..." : status === "listening" ? "Estou te ouvindo..." : status === "error" ? "Não foi possível continuar" : "Pronta para conversar";
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) stop(); onOpenChange(next); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Activity className="h-7 w-7" /></div>
          <DialogTitle>Conversar por voz com Ella</DialogTitle>
          <DialogDescription>Conversa por turnos: reconhecimento de voz do navegador, respostas pela NVIDIA NIM e voz gerada pela NVIDIA Magpie. Ella é uma IA de apoio emocional, não uma psicóloga.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-5 py-4">
          <div className={`relative flex h-36 w-36 items-center justify-center rounded-full transition-all duration-500 ${status === "speaking" ? "bg-primary/25 ring-8 ring-primary/10" : status === "listening" ? "bg-primary/15 ring-4 ring-primary/10" : "bg-muted"}`}>
            <div className={`flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground ${status === "speaking" ? "animate-pulse" : ""}`}>
              {status === "connecting" ? <Loader2 className="h-10 w-10 animate-spin" /> : status === "listening" ? <Mic className="h-10 w-10" /> : status === "speaking" ? <Volume2 className="h-10 w-10" /> : <Activity className="h-10 w-10" />}
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold">{statusLabel}</p>
            <p className="mt-2 max-h-24 overflow-y-auto text-sm text-muted-foreground">{lastText}</p>
          </div>
          {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
          <div className="flex items-center justify-center gap-4">
            {status === "idle" || status === "error" ? (
              <Button onClick={start} disabled={!consent}><Mic className="mr-2 h-4 w-4" />Iniciar conversa</Button>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={toggleMute} aria-label={muted ? "Ativar microfone" : "Silenciar microfone"}>{muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>
                <Button variant="destructive" onClick={stop}><PhoneOff className="mr-2 h-4 w-4" />Encerrar</Button>
              </>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">O navegador reconhece sua fala; a NVIDIA gera a resposta e o áudio. O microfone fica ativo somente durante a sessão. Você pode encerrar quando quiser.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
