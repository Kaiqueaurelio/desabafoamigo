"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  HeartHandshake,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Phone,
  Volume2,
} from "lucide-react";
import { motion } from "framer-motion";
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
type VoiceStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
type RiskLevel = "none" | "attention" | "urgent";
type RecognitionResult = { isFinal: boolean; 0?: { transcript?: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionError = { error?: string };
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionError) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => RecognitionLike;
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consent: boolean;
  messages: VoiceMessage[];
  onTranscript: (message: VoiceMessage) => void;
  onRisk: (level: "attention" | "urgent") => void;
  onTransferHuman: () => void | Promise<void>;
  handoffBusy?: boolean;
  queueId?: string | null;
};

const SILENCE_MS = 950;
const MAX_VOICE_HISTORY = 16;

export function EllaVoiceMode({
  open,
  onOpenChange,
  consent,
  messages,
  onTranscript,
  onRisk,
  onTransferHuman,
  handoffBusy = false,
  queueId = null,
}: Props) {
  const send = useServerFn(aiChat);
  const transcribe = useServerFn(transcribeVoice);
  const synthesize = useServerFn(synthesizeEllaSpeech);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [lastText, setLastText] = useState("Toque em iniciar e converse naturalmente com a Ella.");
  const [showCaptions, setShowCaptions] = useState(true);
  const [risk, setRisk] = useState<RiskLevel>("none");
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const processingRef = useRef(false);
  const messagesRef = useRef(messages);
  const callbacksRef = useRef({ onTranscript, onRisk, onTransferHuman });
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTranscriptRef = useRef("");
  const interimTranscriptRef = useRef("");
  const recorderFallbackRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fallbackHasSpeechRef = useRef(false);
  const fallbackLastVoiceRef = useRef(0);
  const fallbackStoppingRef = useRef(false);
  const statusRef = useRef<VoiceStatus>("idle");
  const startRecorderFallbackRef = useRef<() => Promise<void>>(async () => {});
  const startFallbackRecorderSegmentRef = useRef<() => void>(() => {});
  const externalSpeechFallbackRef = useRef<(text: string) => Promise<void>>(async () => {});
  const startRecognitionRef = useRef<() => void>(() => {});

  messagesRef.current = messages;
  callbacksRef.current = { onTranscript, onRisk, onTransferHuman };

  const updateStatus = useCallback((next: VoiceStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const appendMessage = useCallback((message: VoiceMessage) => {
    messagesRef.current = [...messagesRef.current, message].slice(-MAX_VOICE_HISTORY);
    callbacksRef.current.onTranscript(message);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }, []);

  const stopPlayback = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
  }, []);

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // The recognition service may already have stopped.
      }
    }
  }, []);

  const stopRecorderFallback = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {
        // Ignore a recorder that was already stopped by the browser.
      }
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    analyserRef.current = null;
    if (context && context.state !== "closed") void context.close();
    recorderChunksRef.current = [];
    fallbackHasSpeechRef.current = false;
    fallbackStoppingRef.current = false;
  }, []);

  const stop = useCallback(() => {
    activeRef.current = false;
    processingRef.current = false;
    recorderFallbackRef.current = false;
    clearSilenceTimer();
    stopRecognition();
    stopPlayback();
    stopRecorderFallback();
    pendingTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    mutedRef.current = false;
    setMuted(false);
    setRisk("none");
    updateStatus("idle");
  }, [
    clearSilenceTimer,
    stopPlayback,
    stopRecognition,
    stopRecorderFallback,
    updateStatus,
  ]);

  const speakWithBrowser = useCallback(
    (text: string): boolean => {
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        typeof SpeechSynthesisUtterance === "undefined"
      ) {
        return false;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 0.98;
      utterance.pitch = 1.02;
      utterance.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((item) => item.lang.toLowerCase() === "pt-br") ??
        voices.find((item) => item.lang.toLowerCase().startsWith("pt"));
      if (voice) utterance.voice = voice;
      utterance.onstart = () => updateStatus("speaking");
      utterance.onend = () => {
        utteranceRef.current = null;
        if (activeRef.current) updateStatus("listening");
      };
      utterance.onerror = (event) => {
        utteranceRef.current = null;
        if (!activeRef.current || event.error === "interrupted" || event.error === "canceled") {
          return;
        }
        // Native speech is preferred for speed. NVIDIA Magpie is only a fallback.
        void externalSpeechFallbackRef.current(text);
      };
      utteranceRef.current = utterance;
      updateStatus("speaking");
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [updateStatus],
  );

  const speakWithExternalFallback = useCallback(
    async (text: string) => {
      if (!activeRef.current) return;
      try {
        const result = await synthesize({ data: { consent: true, text: text.slice(0, 900) } });
        if (!activeRef.current) return;
        const audio = new Audio(
          `data:${result.mimeType};base64,${result.audioBase64}`,
        );
        audioRef.current = audio;
        audio.onended = () => {
          audioRef.current = null;
          if (activeRef.current) updateStatus("listening");
        };
        audio.onerror = () => {
          audioRef.current = null;
          if (activeRef.current) updateStatus("listening");
        };
        updateStatus("speaking");
        await audio.play();
      } catch (cause) {
        console.warn("[Ella voice] external TTS fallback unavailable", cause);
        if (activeRef.current) {
          setError("A voz do aparelho não está disponível agora. Você ainda pode continuar falando e ler as legendas.");
          updateStatus("listening");
        }
      }
    },
    [synthesize, updateStatus],
  );

  externalSpeechFallbackRef.current = speakWithExternalFallback;

  const speakReply = useCallback(
    async (text: string) => {
      if (!activeRef.current) return;
      stopPlayback();
      const spokenText = text.replace(/\s+/g, " ").trim().slice(0, 900);
      if (!spokenText) {
        updateStatus("listening");
        return;
      }
      if (!speakWithBrowser(spokenText)) {
        await speakWithExternalFallback(spokenText);
      }
    },
    [speakWithBrowser, speakWithExternalFallback, stopPlayback, updateStatus],
  );

  const processTurn = useCallback(
    async (transcript: string) => {
      const cleanTranscript = transcript.replace(/\s+/g, " ").trim();
      if (!cleanTranscript || processingRef.current || !activeRef.current) return;
      processingRef.current = true;
      clearSilenceTimer();
      pendingTranscriptRef.current = "";
      interimTranscriptRef.current = "";
      if (!recorderFallbackRef.current) stopRecognition();
      updateStatus("thinking");
      setLastText(cleanTranscript);
      setError("");
      const userMessage: VoiceMessage = { role: "user", content: cleanTranscript };
      appendMessage(userMessage);
      const conversation = [...messagesRef.current].slice(-MAX_VOICE_HISTORY);
      try {
        const result = await send({
          data: {
            consent: true,
            rememberContext: false,
            retentionDays: 7,
            voiceMode: true,
            messages: conversation,
            attachments: [],
          },
        });
        if (!activeRef.current) return;
        appendMessage({ role: "assistant", content: result.reply });
        setLastText(result.reply);
        if (result.risk?.level === "urgent" || result.risk?.level === "attention") {
          setRisk(result.risk.level);
          callbacksRef.current.onRisk(result.risk.level);
        }
        processingRef.current = false;
        if (recorderFallbackRef.current) startFallbackRecorderSegmentRef.current();
        else startRecognitionRef.current();
        await speakReply(result.reply);
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "Não consegui responder agora. Podemos tentar novamente.";
        setError(message);
        processingRef.current = false;
        updateStatus("error");
        if (activeRef.current) {
          if (recorderFallbackRef.current) startFallbackRecorderSegmentRef.current();
          else startRecognitionRef.current();
        }
      }
    },
    [appendMessage, clearSilenceTimer, send, speakReply, stopRecognition, updateStatus],
  );

  const scheduleSpeechEnd = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      const transcript = [pendingTranscriptRef.current, interimTranscriptRef.current]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (transcript) void processTurn(transcript);
    }, SILENCE_MS);
  }, [clearSilenceTimer, processTurn]);

  const startRecognition = useCallback(() => {
    if (!activeRef.current || mutedRef.current || processingRef.current) return;
    const speechWindow = window as Window & {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      recorderFallbackRef.current = true;
      void startRecorderFallbackRef.current();
      return;
    }
    recorderFallbackRef.current = false;
    try {
      const recognition = new Constructor();
      recognition.lang = "pt-BR";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let interim = "";
        const finalParts: string[] = [];
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const item = event.results[index];
          const value = item?.[0]?.transcript?.trim();
          if (!value) continue;
          if (item.isFinal) finalParts.push(value);
          else interim += `${value} `;
        }
        if (finalParts.length) {
          pendingTranscriptRef.current = [
            pendingTranscriptRef.current,
            ...finalParts,
          ].filter(Boolean).join(" ");
        }
        interimTranscriptRef.current = interim.trim();
        if (interim.trim() || finalParts.length) {
          // Barge-in: the first partial transcript interrupts Ella immediately.
          if (statusRef.current === "speaking") {
            stopPlayback();
            updateStatus("listening");
          }
          setLastText(
            [pendingTranscriptRef.current, interimTranscriptRef.current]
              .filter(Boolean)
              .join(" "),
          );
          scheduleSpeechEnd();
        }
      };
      recognition.onerror = (event) => {
        if (!activeRef.current || event.error === "aborted" || event.error === "no-speech") return;
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Permita o acesso ao microfone nas configurações do navegador.");
          updateStatus("error");
          return;
        }
        // Browser speech service can fail on network restrictions; switch to VAD + transcription.
        stopRecognition();
        recorderFallbackRef.current = true;
        void startRecorderFallbackRef.current();
      };
      recognition.onend = () => {
        if (activeRef.current && !mutedRef.current && !processingRef.current) {
          window.setTimeout(() => {
            if (activeRef.current && !mutedRef.current && !processingRef.current) {
              startRecognitionRef.current();
            }
          }, 180);
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
      updateStatus(statusRef.current === "speaking" ? "speaking" : "listening");
      setError("");
    } catch {
      stopRecognition();
      recorderFallbackRef.current = true;
      void startRecorderFallbackRef.current();
    }
  }, [
    scheduleSpeechEnd,
    stopPlayback,
    stopRecognition,
    updateStatus,
  ]);

  startRecognitionRef.current = startRecognition;

  const transcribeFallbackSegment = useCallback(
    async (blob: Blob) => {
      if (!activeRef.current || !blob.size || processingRef.current) return;
      processingRef.current = true;
      updateStatus("thinking");
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === "string"
              ? resolve(reader.result)
              : reject(new Error("Não foi possível ler o áudio."));
          reader.onerror = () => reject(new Error("Não foi possível ler o áudio."));
          reader.readAsDataURL(blob);
        });
        const result = await transcribe({ data: { dataUrl, name: "conversa-ao-vivo" } });
        processingRef.current = false;
        if (result.text.trim()) await processTurn(result.text);
        else if (activeRef.current) {
          updateStatus("listening");
          startFallbackRecorderSegmentRef.current();
        }
      } catch (cause) {
        processingRef.current = false;
        setError(
          cause instanceof Error
            ? cause.message
            : "Não consegui entender o áudio. Tente falar novamente.",
        );
        if (activeRef.current) {
          updateStatus("listening");
          startFallbackRecorderSegmentRef.current();
        }
      }
    },
    [processTurn, transcribe, updateStatus],
  );

  const startFallbackRecorderSegment = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!activeRef.current || mutedRef.current || !stream || mediaRecorderRef.current) return;
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderChunksRef.current = [];
      fallbackHasSpeechRef.current = false;
      fallbackStoppingRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size) recorderChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        mediaRecorderRef.current = null;
        const blob = new Blob(recorderChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        recorderChunksRef.current = [];
        if (fallbackHasSpeechRef.current && blob.size) {
          fallbackHasSpeechRef.current = false;
          void transcribeFallbackSegment(blob);
        } else if (activeRef.current && !mutedRef.current && !processingRef.current) {
          startFallbackRecorderSegmentRef.current();
        }
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
    } catch {
      setError("Não foi possível iniciar a captura de áudio neste navegador.");
      updateStatus("error");
    }
  }, [transcribeFallbackSegment, updateStatus]);

  const startRecorderFallback = useCallback(async () => {
    if (!activeRef.current || mutedRef.current || mediaStreamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador não oferece reconhecimento de voz nem captura de áudio compatível. Tente Chrome ou Safari atualizado.");
      updateStatus("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!activeRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;
      const AudioContextConstructor =
        window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) throw new Error("Áudio não suportado neste navegador.");
      const context = new AudioContextConstructor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = context;
      analyserRef.current = analyser;
      const samples = new Uint8Array(analyser.fftSize);
      const detectVoice = () => {
        if (!activeRef.current || !analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(samples);
        let energy = 0;
        for (const sample of samples) {
          const normalized = (sample - 128) / 128;
          energy += normalized * normalized;
        }
        const rms = Math.sqrt(energy / samples.length);
        const now = performance.now();
        if (rms > 0.035) {
          fallbackHasSpeechRef.current = true;
          fallbackLastVoiceRef.current = now;
          if (statusRef.current === "speaking") {
            stopPlayback();
            updateStatus("listening");
          }
          if (statusRef.current !== "thinking") updateStatus("listening");
        } else if (
          fallbackHasSpeechRef.current &&
          now - fallbackLastVoiceRef.current >= SILENCE_MS &&
          mediaRecorderRef.current &&
          !fallbackStoppingRef.current
        ) {
          fallbackStoppingRef.current = true;
          mediaRecorderRef.current.stop();
        }
        animationFrameRef.current = requestAnimationFrame(detectVoice);
      };
      animationFrameRef.current = requestAnimationFrame(detectVoice);
      startFallbackRecorderSegmentRef.current();
      updateStatus("listening");
      setError("");
    } catch (cause) {
      stopRecorderFallback();
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível acessar o microfone. Verifique a permissão do navegador.",
      );
      updateStatus("error");
    }
  }, [
    stopPlayback,
    stopRecorderFallback,
    updateStatus,
  ]);

  startRecorderFallbackRef.current = startRecorderFallback;
  startFallbackRecorderSegmentRef.current = startFallbackRecorderSegment;

  const start = useCallback(() => {
    if (!consent) {
      setError("É necessário consentir com o processamento de mensagens por IA nas configurações de privacidade.");
      updateStatus("error");
      return;
    }
    stop();
    activeRef.current = true;
    mutedRef.current = false;
    setMuted(false);
    setRisk("none");
    setError("");
    updateStatus("connecting");
    startRecognitionRef.current();
  }, [consent, stop, updateStatus]);

  const toggleMute = useCallback(() => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    if (nextMuted) {
      stopRecognition();
      if (recorderFallbackRef.current) stopRecorderFallback();
      if (statusRef.current !== "speaking") updateStatus("idle");
    } else if (activeRef.current) {
      updateStatus("connecting");
      if (recorderFallbackRef.current) void startRecorderFallbackRef.current();
      else startRecognitionRef.current();
    }
  }, [
    stopRecorderFallback,
    stopRecognition,
    updateStatus,
  ]);

  useEffect(() => {
    if (!open) stop();
    return () => stop();
  }, [open, stop]);

  const statusLabel =
    status === "connecting"
      ? "Preparando o microfone…"
      : status === "thinking"
        ? "Ella está pensando…"
        : status === "speaking"
          ? "Ella está falando — pode interromper"
          : status === "listening"
            ? "Estou te ouvindo…"
            : status === "error"
              ? "Vamos tentar novamente"
              : "Pronta para conversar";

  const orbAnimation =
    status === "listening"
      ? { scale: [1, 1.07, 1], rotate: [0, 2, -2, 0] }
      : status === "thinking"
        ? { scale: [1, 0.96, 1], rotate: [0, 180] }
        : status === "speaking"
          ? { scale: [1, 1.13, 0.98, 1.1, 1] }
          : { scale: 1, rotate: 0 };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) stop();
        onOpenChange(next);
      }}
    >
      <DialogContent className="fixed left-0 top-0 z-[100] flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 bg-[#090d1c] p-0 text-white shadow-none sm:rounded-none">
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-between overflow-y-auto px-5 pb-8 pt-[max(env(safe-area-inset-top),2rem)]">
          <div className="flex w-full max-w-2xl items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/50">
                Desabafo Amigo
              </p>
              <DialogHeader className="mt-1 items-start text-left">
                <DialogTitle className="text-xl text-white">Ella Ribeiro</DialogTitle>
                <DialogDescription className="text-white/55">
                  Voz ao vivo · conversa contínua
                </DialogDescription>
              </DialogHeader>
            </div>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/65">
              IA de acolhimento
            </span>
          </div>

          <div className="flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 py-8">
            <div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
              <motion.div
                aria-hidden="true"
                className="absolute inset-4 rounded-full bg-indigo-500/10 blur-2xl"
                animate={{
                  opacity: status === "speaking" ? [0.35, 0.85, 0.35] : [0.25, 0.5, 0.25],
                  scale: status === "speaking" ? [0.9, 1.2, 0.9] : [0.95, 1.05, 0.95],
                }}
                transition={{ duration: status === "speaking" ? 1.1 : 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-8 rounded-full border border-cyan-300/20"
                animate={{
                  scale: status === "listening" ? [1, 1.16, 1] : status === "speaking" ? [1, 1.24, 1] : 1,
                  opacity: status === "idle" ? 0.25 : [0.25, 0.7, 0.25],
                }}
                transition={{ duration: status === "speaking" ? 1 : 2.2, repeat: Infinity }}
              />
              <motion.div
                className="relative flex h-44 w-44 items-center justify-center rounded-full border border-white/25 bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-700 shadow-[0_0_75px_rgba(75,110,255,0.38)] sm:h-52 sm:w-52"
                animate={orbAnimation}
                transition={{
                  duration: status === "thinking" ? 5 : status === "speaking" ? 0.9 : 2.5,
                  repeat: status === "idle" || status === "error" ? 0 : Infinity,
                  ease: "easeInOut",
                }}
              >
                <motion.div
                  className="absolute inset-3 rounded-full bg-gradient-to-tr from-white/5 via-white/25 to-transparent"
                  animate={{ rotate: status === "thinking" ? 360 : 0 }}
                  transition={{ duration: 8, repeat: status === "thinking" ? Infinity : 0, ease: "linear" }}
                />
                {status === "thinking" ? (
                  <Loader2 className="relative h-12 w-12 animate-spin text-white" />
                ) : status === "speaking" ? (
                  <Volume2 className="relative h-12 w-12 text-white drop-shadow" />
                ) : muted ? (
                  <MicOff className="relative h-12 w-12 text-white" />
                ) : (
                  <Mic className="relative h-12 w-12 text-white drop-shadow" />
                )}
              </motion.div>
            </div>

            <div className="max-w-xl text-center">
              <p className="text-lg font-semibold text-white">{statusLabel}</p>
              {showCaptions && (
                <p
                  className="mt-3 max-h-32 overflow-y-auto text-base leading-relaxed text-white/75"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {lastText}
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-4 inline-flex items-start gap-2 rounded-xl border border-rose-300/25 bg-rose-400/10 p-3 text-left text-sm text-rose-100"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
            </div>

            {(risk === "attention" || risk === "urgent") && (
              <div className="w-full max-w-lg rounded-2xl border border-rose-300/30 bg-rose-500/10 p-4 text-left">
                <p className="font-semibold text-rose-100">
                  Sua segurança vem primeiro. Você não precisa passar por isso sozinho(a).
                </p>
                <p className="mt-2 text-sm text-white/75">
                  Se houver perigo imediato, tentativa, ferimento ou intoxicação, ligue para o SAMU 192.
                  O CVV 188 oferece apoio emocional gratuito. Procure alguém de confiança para ficar com você.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <a href="tel:188"><Phone className="mr-1 h-4 w-4" /> CVV 188</a>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <a href="tel:192"><Phone className="mr-1 h-4 w-4" /> SAMU 192</a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => callbacksRef.current.onTransferHuman()}
                    disabled={handoffBusy || Boolean(queueId)}
                  >
                    <HeartHandshake className="mr-1 h-4 w-4" />
                    {queueId ? "Encaminhamento solicitado" : handoffBusy ? "Conectando…" : "Falar com voluntário"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex w-full max-w-2xl flex-col items-center gap-4 pb-[env(safe-area-inset-bottom)]">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {status === "idle" || status === "error" ? (
                <Button
                  onClick={start}
                  disabled={!consent}
                  className="h-12 rounded-full bg-white px-7 text-base font-semibold text-slate-950 hover:bg-white/90"
                >
                  <Mic className="mr-2 h-5 w-5" />
                  Iniciar conversa
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={toggleMute}
                    aria-label={muted ? "Ativar microfone" : "Silenciar microfone"}
                    className="h-12 w-12 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      stop();
                      onOpenChange(false);
                    }}
                    className="h-12 rounded-full px-6"
                  >
                    <PhoneOff className="mr-2 h-5 w-5" />
                    Encerrar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowCaptions((value) => !value)}
                    aria-label={showCaptions ? "Ocultar legendas" : "Mostrar legendas"}
                    className="h-12 w-12 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  >
                    <span className="text-xs font-bold">CC</span>
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-center text-xs text-white/45">
              <span>Você pode interromper a Ella falando a qualquer momento.</span>
              <span>·</span>
              <span>Ella é uma IA, não uma psicóloga.</span>
            </div>
            {status !== "idle" && status !== "error" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white/65 hover:bg-white/10 hover:text-white"
                onClick={() => callbacksRef.current.onTransferHuman()}
                disabled={handoffBusy || Boolean(queueId)}
              >
                <HeartHandshake className="mr-2 h-4 w-4" />
                {queueId ? "Você está na fila de voluntários" : "Prefiro conversar com uma pessoa"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
