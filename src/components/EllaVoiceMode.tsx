"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { HeartHandshake, Mic, MicOff, PhoneOff, Volume2, Loader2, AlertCircle, Phone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { aiChat, transcribeVoice } from "@/lib/aiChat.functions";
import { synthesizeEllaSpeech } from "@/lib/voice.functions";

type VoiceMessage = { role: "user" | "assistant"; content: string };
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consent: boolean;
  messages: VoiceMessage[];
  onTranscript: (message: VoiceMessage) => void;
  onRisk: (level: "attention" | "urgent") => void;
  onTransfer?: () => void;
};
type VoiceStatus = "idle" | "connecting" | "listening" | "speaking" | "error";
type SpeechResult = { isFinal: boolean; 0?: { transcript?: string } };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  resultIndex: number;
  onresult: ((event: { results: ArrayLike<SpeechResult>; resultIndex?: number }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function EllaVoiceMode({
  open,
  onOpenChange,
  consent,
  messages,
  onTranscript,
  onRisk,
  onTransfer,
}: Props) {
  const send = useServerFn(aiChat);
  const speak = useServerFn(synthesizeEllaSpeech);
  const transcribe = useServerFn(transcribeVoice);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [riskLevel, setRiskLevel] = useState<"none" | "attention" | "urgent">("none");
  const [lastText, setLastText] = useState("Toque em iniciar para conversar com a Ella.");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const speakingRef = useRef(false);
  const messagesRef = useRef(messages);
  const callbacksRef = useRef({ onTranscript, onRisk, onTransfer });
  const silenceTimerRef = useRef<number | null>(null);
  const pendingTranscriptRef = useRef("");
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const speechFallbackRef = useRef(false);

  messagesRef.current = messages;
  callbacksRef.current = { onTranscript, onRisk, onTransfer };

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current !== null) window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  };

  const stopPlayback = useCallback(() => {
    speakingRef.current = false;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const stopFallbackCapture = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    fallbackStreamRef.current?.getTracks().forEach((track) => track.stop());
    fallbackStreamRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    busyRef.current = false;
    clearSilenceTimer();
    pendingTranscriptRef.current = "";
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    stopPlayback();
    stopFallbackCapture();
    setMuted(false);
    setStatus("idle");
  }, [stopFallbackCapture, stopPlayback]);

  const speakNatively = useCallback((text: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
        reject(new Error("A voz deste navegador não está disponível."));
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 0.96;
      utterance.pitch = 1.04;
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find((item) => item.lang.toLowerCase() === "pt-br")
        ?? voices.find((item) => item.lang.toLowerCase().startsWith("pt"));
      if (voice) utterance.voice = voice;
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("A voz nativa foi interrompida."));
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const playReply = useCallback(async (text: string) => {
    speakingRef.current = true;
    setStatus("speaking");
    try {
      const audioResult = await speak({ data: { consent: true, text } });
      if (!activeRef.current || !speakingRef.current) return;
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(`data:${audioResult.mimeType};base64,${audioResult.audioBase64}`);
        audioRef.current = audio;
        audio.onended = () => { audioRef.current = null; resolve(); };
        audio.onerror = () => { audioRef.current = null; reject(new Error("Falha ao reproduzir a voz externa.")); };
        void audio.play().catch(reject);
      });
    } catch (cause) {
      if (!activeRef.current || !speakingRef.current) return;
      console.warn("[EllaVoiceMode] NVIDIA TTS indisponível; usando voz nativa.", cause);
      try {
        await speakNatively(text);
      } catch {
        setError("Não foi possível reproduzir áudio neste navegador. A conversa por texto continua disponível.");
      }
    } finally {
      if (speakingRef.current) {
        speakingRef.current = false;
        if (activeRef.current) setStatus("listening");
      }
    }
  }, [speak, speakNatively]);

  const processTurn = useCallback(async (transcript: string) => {
    const clean = transcript.trim();
    if (!clean || busyRef.current || !activeRef.current) return;
    busyRef.current = true;
    clearSilenceTimer();
    pendingTranscriptRef.current = "";
    recognitionRef.current?.stop();
    stopFallbackCapture();
    stopPlayback();
    setStatus("connecting");
    setLastText(clean);
    callbacksRef.current.onTranscript({ role: "user", content: clean });
    const nextMessages = [...messagesRef.current, { role: "user" as const, content: clean }].slice(-16);
    try {
      const result = await send({
        data: {
          consent: true,
          rememberContext: false,
          retentionDays: 7,
          voiceMode: true,
          messages: nextMessages,
          attachments: [],
        },
      });
      if (!activeRef.current) return;
      callbacksRef.current.onTranscript({ role: "assistant", content: result.reply });
      if (result.risk?.level === "urgent" || result.risk?.level === "attention") {
        setRiskLevel(result.risk.level);
        callbacksRef.current.onRisk(result.risk.level);
      }
      setLastText(result.reply);
      busyRef.current = false;
      startRecognitionRef.current?.();
      await playReply(result.reply);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Falha na conversa por voz.";
      setError(message);
      setStatus("error");
      busyRef.current = false;
      if (activeRef.current) startRecognitionRef.current?.();
    }
  }, [playReply, send, stopFallbackCapture, stopPlayback]);

  const scheduleTurn = (transcript: string) => {
    pendingTranscriptRef.current = transcript;
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      const finalText = pendingTranscriptRef.current.trim();
      if (finalText) void processTurn(finalText);
    }, 950);
  };

  const startRecognitionRef = useRef<(() => void) | null>(null);

  const startBrowserRecognition = useCallback(() => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) return false;

    const recognition = new Constructor();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      if (!activeRef.current || muted) return;
      let combined = "";
      let hasSpeech = false;
      const startAt = event.resultIndex ?? 0;
      for (let index = startAt; index < event.results.length; index += 1) {
        const item = event.results[index];
        const transcript = item?.[0]?.transcript?.trim();
        if (transcript) {
          combined += (combined ? " " : "") + transcript;
          hasSpeech = true;
        }
      }
      if (!hasSpeech) return;
      if (speakingRef.current) {
        stopPlayback();
        setStatus("listening");
      }
      const previous = pendingTranscriptRef.current;
      scheduleTurn([previous, combined].filter(Boolean).join(" ").slice(-1800));
    };
    recognition.onerror = (event) => {
      if (!activeRef.current || event.error === "aborted" || event.error === "no-speech") return;
      if (event.error === "not-allowed") {
        setError("Permita o acesso ao microfone para conversar com a Ella.");
        setStatus("error");
        return;
      }
      setError("A escuta foi interrompida. Tentando reconectar o microfone…");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (activeRef.current && !muted && !busyRef.current) {
        window.setTimeout(() => startRecognitionRef.current?.(), 180);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setStatus(speakingRef.current ? "speaking" : "listening");
      setError("");
      return true;
    } catch {
      recognitionRef.current = null;
      return false;
    }
  }, [muted, stopPlayback]);

  const startFallbackRecognition = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador não oferece reconhecimento de fala nem gravação compatível. Experimente Chrome ou Edge atualizado.");
      setStatus("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!activeRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      fallbackStreamRef.current = stream;
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      let heardVoice = false;
      let lastVoiceAt = 0;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        stopFallbackCapture();
        if (!activeRef.current || blob.size < 1500) {
          if (activeRef.current && !muted) startRecognitionRef.current?.();
          return;
        }
        busyRef.current = true;
        setStatus("connecting");
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Falha ao ler áudio."));
            reader.onerror = () => reject(new Error("Falha ao ler áudio."));
            reader.readAsDataURL(blob);
          });
          const result = await transcribe({ data: { dataUrl, name: "voz-ao-vivo" } });
          busyRef.current = false;
          if (result.text?.trim()) await processTurn(result.text);
          else if (activeRef.current) startRecognitionRef.current?.();
        } catch {
          busyRef.current = false;
          setError("Não consegui transcrever esse trecho. Tente falar novamente.");
          if (activeRef.current) startRecognitionRef.current?.();
        }
      };
      recorder.start(250);
      const detect = () => {
        if (!activeRef.current || muted || recorder.state === "inactive") return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) { const normalized = (value - 128) / 128; sum += normalized * normalized; }
        const volume = Math.sqrt(sum / data.length);
        const now = Date.now();
        if (volume > 0.035) { heardVoice = true; lastVoiceAt = now; }
        if (heardVoice && now - lastVoiceAt > 1050 && now - lastVoiceAt < 2000) {
          recorder.stop();
          return;
        }
        rafRef.current = requestAnimationFrame(detect);
      };
      setStatus("listening");
      setError("");
      rafRef.current = requestAnimationFrame(detect);
    } catch {
      setError("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
      setStatus("error");
    }
  }, [muted, processTurn, stopFallbackCapture, transcribe]);

  startRecognitionRef.current = () => {
    if (!activeRef.current || muted || busyRef.current || recognitionRef.current) return;
    if (!startBrowserRecognition()) {
      speechFallbackRef.current = true;
      void startFallbackRecognition();
    }
  };

  const start = () => {
    if (!consent) {
      setError("É necessário consentir com o processamento de mensagens por IA nas configurações de privacidade.");
      setStatus("error");
      return;
    }
    setError("");
    activeRef.current = true;
    busyRef.current = false;
    setLastText("Estou ouvindo. Pode falar naturalmente.");
    startRecognitionRef.current?.();
  };

  const toggleMute = () => {
    if (muted) {
      setMuted(false);
      if (speechFallbackRef.current) void startFallbackRecognition();
      else startRecognitionRef.current?.();
    } else {
      setMuted(true);
      clearSilenceTimer();
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      stopFallbackCapture();
      stopPlayback();
      setStatus("idle");
    }
  };

  useEffect(() => {
    if (!open) stop();
    return () => stop();
  }, [open, stop]);

  const statusLabel = status === "connecting" ? "Ella está pensando…"
    : status === "speaking" ? "Ella está falando…"
    : status === "listening" ? "Estou te ouvindo…"
    : status === "error" ? "Vamos tentar novamente"
    : "Pronta para conversar";

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) stop(); onOpenChange(next); }}>
      <DialogContent className="h-[min(92dvh,760px)] max-h-[92dvh] overflow-y-auto border-primary/20 bg-background/95 backdrop-blur-xl sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-xl">Ella Ribeiro</DialogTitle>
          <DialogDescription>
            Conversa por voz contínua. Você pode falar naturalmente e interromper a Ella quando quiser. Sou uma IA de apoio emocional, não uma psicóloga.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-[430px] flex-col items-center justify-center gap-5 py-4">
          <div className="relative grid size-64 place-items-center">
            <div className={`absolute inset-0 rounded-full bg-primary/10 blur-2xl transition-all duration-700 ${status === "speaking" ? "scale-125 opacity-100" : status === "listening" ? "scale-110 opacity-80" : "scale-90 opacity-40"}`} />
            <div className={`absolute inset-5 rounded-full border border-primary/20 ${status === "thinking" || status === "connecting" ? "animate-spin border-t-primary" : ""} ${status === "listening" ? "animate-pulse" : ""}`} />
            <div className={`relative grid size-40 place-items-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-violet-500 text-primary-foreground shadow-[0_0_70px_hsl(var(--primary)/0.28)] transition-transform duration-300 ${status === "speaking" ? "scale-110 animate-pulse" : status === "listening" ? "scale-105" : ""}`}>
              {status === "connecting" ? <Loader2 className="size-12 animate-spin" />
                : status === "speaking" ? <Volume2 className="size-12" />
                : <Mic className="size-12" />}
            </div>
          </div>
          <div className="max-w-sm text-center">
            <p className="font-semibold" aria-live="polite">{statusLabel}</p>
            <p className="mt-2 max-h-24 overflow-y-auto text-sm text-muted-foreground">{lastText}</p>
          </div>
          {error && <p role="alert" className="flex max-w-md items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</p>}
          {riskLevel !== "none" && (
            <div role="alert" className="w-full rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4" />Sua segurança vem primeiro. Não fique sozinho(a).</p>
              <p className="mt-1 text-muted-foreground">Se houver perigo imediato, ferimento ou tentativa, procure ajuda presencial e ligue para a emergência.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild><a href="tel:188"><Phone className="mr-1 size-4" />CVV 188</a></Button>
                <Button size="sm" variant="outline" asChild><a href="tel:192"><Phone className="mr-1 size-4" />SAMU 192</a></Button>
                {onTransfer && <Button size="sm" onClick={onTransfer}><HeartHandshake className="mr-1 size-4" />Voluntário</Button>}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {status === "idle" || status === "error" ? (
              <Button onClick={start} disabled={!consent}><Mic className="mr-2 size-4" />Iniciar conversa</Button>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={toggleMute} aria-label={muted ? "Ativar microfone" : "Silenciar microfone"}>
                  {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </Button>
                {onTransfer && <Button variant="outline" onClick={onTransfer}><HeartHandshake className="mr-1 size-4" />Falar com voluntário</Button>}
                <Button variant="destructive" onClick={() => { stop(); onOpenChange(false); }}><PhoneOff className="mr-2 size-4" />Encerrar</Button>
              </>
            )}
          </div>
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            O microfone funciona apenas durante esta sessão. A voz NVIDIA é preferida; se falhar, usamos automaticamente a voz disponível no navegador.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
