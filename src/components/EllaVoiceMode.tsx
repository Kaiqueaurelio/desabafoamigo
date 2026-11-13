"use client";

import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Mic, MicOff, PhoneOff, Volume2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createEllaVoiceSession } from "@/lib/voice.functions";
import { assessRisk } from "@/lib/aiSafety";

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

export function EllaVoiceMode({ open, onOpenChange, consent, messages, onTranscript, onRisk }: Props) {
  const createSession = useServerFn(createEllaVoiceSession);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [lastText, setLastText] = useState("Toque em iniciar para conversar com a Ella.");
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seenRef = useRef<string[]>([]);
  const transcriptRef = useRef("");

  async function stop() {
    channelRef.current?.close();
    channelRef.current = null;
    peerRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    setMuted(false);
    setStatus("idle");
  }

  async function start() {
    if (!consent) {
      setError("É necessário consentir com o processamento de mensagens por IA nas configurações de privacidade.");
      setStatus("error");
      return;
    }
    setError("");
    setStatus("connecting");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
        throw new Error("Seu navegador não oferece suporte à conversa por voz. Atualize o navegador ou use outro dispositivo.");
      }
      const { token } = await createSession({ data: { consent: true, messages: messages.slice(-12) } });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = stream;
      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        void audio.play().catch(() => setError("Toque na tela para permitir a reprodução de áudio."));
      };
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = peer.createDataChannel("ella-events");
      channelRef.current = channel;
      channel.onopen = () => setStatus("listening");
      channel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string; transcript?: string; delta?: string; item_id?: string; response_id?: string };
          if (payload.type === "input_audio_buffer.speech_started") setStatus("listening");
          if (payload.type === "output_audio_buffer.started" || payload.type === "response.created") setStatus("speaking");
          if (payload.type === "output_audio_buffer.stopped" || payload.type === "response.done") setStatus("listening");
          if (payload.type === "conversation.item.input_audio_transcription.completed" && payload.transcript?.trim()) {
            const transcript = payload.transcript.trim();
            const key = "u:" + transcript;
            if (!seenRef.current.includes(key)) {
              seenRef.current = [...seenRef.current.slice(-30), key];
              transcriptRef.current += "\n" + transcript;
              setLastText(transcript);
              onTranscript({ role: "user", content: transcript });
              const risk = assessRisk(transcriptRef.current, 0);
              if (risk.level !== "none") onRisk(risk.level);
            }
          }
          if (payload.type === "response.output_audio_transcript.done" && payload.transcript?.trim()) {
            const transcript = payload.transcript.trim();
            const key = "a:" + transcript;
            if (!seenRef.current.includes(key)) {
              seenRef.current = [...seenRef.current.slice(-30), key];
              setLastText(transcript);
              onTranscript({ role: "assistant", content: transcript });
            }
          }
        } catch { /* ignore non-JSON transport messages */ }
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
          setError("A conexão de voz foi interrompida. Você pode tentar iniciar novamente.");
          void stop();
        }
      };
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const sdp = offer.sdp;
      if (!sdp) throw new Error("Não foi possível preparar o áudio do microfone.");
      const answerResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: sdp,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/sdp" },
      });
      if (!answerResponse.ok) throw new Error("Não foi possível conectar ao serviço de voz. Tente novamente.");
      await peer.setRemoteDescription({ type: "answer", sdp: await answerResponse.text() });
      if (channel.readyState === "open") setStatus("listening");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Falha ao iniciar a conversa por voz.";
      setError(message);
      setStatus("error");
      await stop();
      setStatus("error");
    }
  }

  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  useEffect(() => {
    if (!open) void stop();
    return () => { void stop(); };
  }, [open]);

  const statusLabel = status === "connecting" ? "Conectando com a Ella..." : status === "speaking" ? "Ella está falando..." : status === "listening" ? "Estou te ouvindo..." : status === "error" ? "Não foi possível conectar" : "Pronta para conversar";

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) void stop(); onOpenChange(next); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Activity className="h-7 w-7" /></div>
          <DialogTitle>Conversar por voz com Ella</DialogTitle>
          <DialogDescription>Conversa falada em tempo real. A Ella é uma inteligência artificial de apoio emocional, não uma psicóloga.</DialogDescription>
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
              <Button onClick={() => void start()} disabled={!consent}><Mic className="mr-2 h-4 w-4" />Iniciar conversa</Button>
            ) : (
              <>
                <Button variant="outline" size="icon" onClick={toggleMute} aria-label={muted ? "Ativar microfone" : "Silenciar microfone"}>{muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>
                <Button variant="destructive" onClick={() => void stop()}><PhoneOff className="mr-2 h-4 w-4" />Encerrar</Button>
              </>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">Use um ambiente privado. O microfone fica ativo apenas durante a sessão. Você pode encerrar quando quiser.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
