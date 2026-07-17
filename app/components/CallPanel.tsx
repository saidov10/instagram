"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { api } from "../services/api";
import { getSocket } from "../services/socket";
import Avatar from "./Avatar";

export type CallType = "AUDIO" | "VIDEO";

/** A call session as returned by the backend. Field names are normalized here. */
export interface CallSession {
  callId: string;
  chatId: number;
  channelName: string;
  iceServers: RTCIceServer[];
  type: CallType;
  status: string;
  callerId: string;
  recipientId: string;
}

/** Used only if the backend's iceServers list is ever empty — keeps calls on the same
 *  network (or ones where NAT traversal doesn't need help) working regardless. */
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

export function mapCall(raw: any): CallSession | null {
  if (!raw) return null;
  const callId = String(raw.callId ?? raw.id ?? "");
  if (!callId) return null;
  const rawIce = raw.iceServers ?? raw.iceServer ?? [];
  const iceServers: RTCIceServer[] =
    Array.isArray(rawIce) && rawIce.length > 0
      ? rawIce.map((s: any) => ({
          urls: s.urls ?? s.url,
          username: s.username || undefined,
          credential: s.credential || undefined,
        }))
      : FALLBACK_ICE_SERVERS;
  return {
    callId,
    chatId: raw.chatId ?? raw.chat?.id ?? 0,
    channelName: raw.channelName ?? raw.channel ?? "",
    iceServers,
    type: (String(raw.type || "AUDIO").toUpperCase() === "VIDEO" ? "VIDEO" : "AUDIO") as CallType,
    status: String(raw.status || "RINGING").toUpperCase(),
    callerId: raw.callerId ?? raw.initiatorId ?? raw.callerUserId ?? "",
    recipientId: raw.recipientId ?? raw.receiverId ?? "",
  };
}

/** Rejects if `promise` doesn't settle within `ms`, so a hung join surfaces an error. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`__timeout__:${label}`)), ms)
    ),
  ]);
}

/** Turns raw getUserMedia/RTCPeerConnection errors into a message that says what to fix. */
function describeCallError(err: any): string {
  const name = err?.name || "";
  const code = err?.code || "";
  const msg = String(err?.message || "");

  if (msg.startsWith("__timeout__")) {
    return "Не удалось подключиться (истекло время). Проверьте доступ к микрофону/камере и сеть.";
  }
  if (name === "NotAllowedError" || code === "PERMISSION_DENIED" || /permission denied/i.test(msg)) {
    return "Доступ к микрофону/камере запрещён. Разрешите его в браузере (значок 🔒 в адресной строке) и повторите.";
  }
  if (name === "NotFoundError" || code === "DEVICE_NOT_FOUND") {
    return "Микрофон или камера не найдены на этом устройстве.";
  }
  return msg || "Не удалось подключиться к звонку.";
}

type Phase = "outgoing" | "incoming" | "connected";

interface CallPanelProps {
  call: CallSession;
  phase: Phase;
  peerName: string;
  peerAvatar?: string;
  /** Whether the local user is the one who placed the call — only the caller creates the SDP offer. */
  isCaller: boolean;
  onAccepted: (session: CallSession) => void;
  onEnded: () => void;
}

/**
 * Full-screen call UI. Drives a plain RTCPeerConnection for the connected phase,
 * signaled over the app's Socket.IO connection, and reports Accept / Reject / End
 * back to the backend over REST.
 */
export default function CallPanel({ call, phase, peerName, peerAvatar, isCaller, onAccepted, onEnded }: CallPanelProps) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  // Guards the join effect so it runs exactly once per call. Using state (`joining`/`joined`)
  // as the guard is a trap: setJoining(true) fires inside the effect, and if that state is in
  // the dependency array the effect re-runs, its cleanup flips `cancelled`, and the original
  // join() bails at its first `if (cancelled) return` — leaving the UI stuck on "Подключение…".
  const joinStartedRef = useRef(false);

  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(call.type === "VIDEO");
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);

  /** Tears down WebRTC: stops local tracks, closes the peer connection, leaves the signaling room. */
  const leaveCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (localRef.current) localRef.current.srcObject = null;
    if (remoteRef.current) remoteRef.current.srcObject = null;
    pcRef.current?.close();
    pcRef.current = null;
    try {
      getSocket().emit("call:leave", { channelName: call.channelName });
    } catch {
      /* socket already gone */
    }
    setJoined(false);
    setRemoteJoined(false);
  }, [call.channelName]);

  // ---- Ringtone while ringing (both directions) ----
  useEffect(() => {
    if (phase === "connected") {
      ringtoneRef.current?.pause();
      return;
    }
    const audio = ringtoneRef.current;
    audio?.play().catch(() => {
      /* autoplay may be blocked until the user interacts — not fatal */
    });
    return () => {
      audio?.pause();
    };
  }, [phase]);

  // ---- Call duration ticker ----
  useEffect(() => {
    if (phase !== "connected" || !joined) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, joined]);

  // ---- WebRTC connect once we reach the connected phase ----
  useEffect(() => {
    if (phase !== "connected" || joinStartedRef.current) return;
    joinStartedRef.current = true;

    let cancelled = false;
    const cleanupFns: (() => void)[] = [];

    const start = async () => {
      if (!call.channelName) {
        setError("Бэкенд не вернул channelName для звонка.");
        return;
      }

      setJoining(true);
      setError(null);
      try {
        const stream = await withTimeout(
          navigator.mediaDevices.getUserMedia({ audio: true, video: call.type === "VIDEO" }),
          20000,
          "media"
        );
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({ iceServers: call.iceServers });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const socket = getSocket();
        const pendingCandidates: RTCIceCandidateInit[] = [];
        let remoteDescSet = false;

        const flushPendingCandidates = async () => {
          const queued = pendingCandidates.splice(0);
          for (const c of queued) {
            try {
              await pc.addIceCandidate(c);
            } catch (err) {
              console.error("Failed to add queued ICE candidate:", err);
            }
          }
        };

        pc.ontrack = (e) => {
          if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
          remoteStreamRef.current.addTrack(e.track);
          if (remoteRef.current) remoteRef.current.srcObject = remoteStreamRef.current;
          setRemoteJoined(true);
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket.emit("call:ice-candidate", { channelName: call.channelName, candidate: e.candidate });
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "failed") {
            setError("Соединение прервано — не удалось найти прямой путь между устройствами.");
          }
        };

        const onPeerJoined = async () => {
          if (!isCaller) return;
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("call:offer", { channelName: call.channelName, sdp: pc.localDescription });
          } catch (err) {
            console.error("Failed to create offer:", err);
          }
        };

        const onOffer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
          try {
            await pc.setRemoteDescription(sdp);
            remoteDescSet = true;
            await flushPendingCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("call:answer", { channelName: call.channelName, sdp: pc.localDescription });
          } catch (err) {
            console.error("Failed to handle offer:", err);
          }
        };

        const onAnswer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
          try {
            await pc.setRemoteDescription(sdp);
            remoteDescSet = true;
            await flushPendingCandidates();
          } catch (err) {
            console.error("Failed to handle answer:", err);
          }
        };

        const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          if (!candidate) return;
          if (remoteDescSet) {
            try {
              await pc.addIceCandidate(candidate);
            } catch (err) {
              console.error("Failed to add ICE candidate:", err);
            }
          } else {
            pendingCandidates.push(candidate);
          }
        };

        const onPeerLeft = () => {
          setRemoteJoined(false);
          leaveCall();
          onEnded();
        };

        socket.on("call:peer-joined", onPeerJoined);
        socket.on("call:offer", onOffer);
        socket.on("call:answer", onAnswer);
        socket.on("call:ice-candidate", onIceCandidate);
        socket.on("call:peer-left", onPeerLeft);
        cleanupFns.push(() => {
          socket.off("call:peer-joined", onPeerJoined);
          socket.off("call:offer", onOffer);
          socket.off("call:answer", onAnswer);
          socket.off("call:ice-candidate", onIceCandidate);
          socket.off("call:peer-left", onPeerLeft);
        });

        socket.emit("call:join", { channelName: call.channelName });

        if (!cancelled) setJoined(true);
      } catch (err: any) {
        console.error("Call connect failed:", err);
        if (!cancelled) setError(describeCallError(err));
      } finally {
        if (!cancelled) setJoining(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, [phase, call.channelName, call.type, call.iceServers, isCaller, leaveCall, onEnded]);

  // Always release the mic/camera and leave the signaling room when this panel unmounts.
  useEffect(() => {
    return () => {
      leaveCall();
    };
  }, [leaveCall]);

  // ---- Actions ----
  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const raw = await api.chat.respondToCall({ callId: call.callId, status: "ACCEPTED" });
      onAccepted(mapCall(raw) ?? call);
    } catch (err) {
      console.error("Failed to accept call:", err);
      setError("Не удалось принять звонок.");
    } finally {
      setBusy(false);
    }
  };

  const handleHangUp = async (status: "REJECTED" | "ENDED") => {
    if (busy) return;
    setBusy(true);
    try {
      await api.chat.respondToCall({ callId: call.callId, status });
    } catch (err) {
      console.error("Failed to end call:", err);
    } finally {
      leaveCall();
      setBusy(false);
      onEnded();
    }
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const statusLine =
    phase === "incoming"
      ? `Входящий ${call.type === "VIDEO" ? "видеозвонок" : "аудиозвонок"}...`
      : phase === "outgoing"
        ? "Гудки..."
        : joining
          ? "Подключение..."
          : remoteJoined
            ? mmss
            : "Ожидание собеседника...";

  return (
    <div className="fixed inset-0 z-70 bg-zinc-950 flex flex-col items-center justify-center text-white select-none">
      {/* Ringtone: a short synthesized beep loop keeps this dependency-free. */}
      <audio
        ref={ringtoneRef}
        loop
        src="data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAEAAAAAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8="
      />

      {/* Remote media: visible full-screen for video calls, kept in the DOM (silently) for
          audio calls so the remote audio track still plays through it. */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className={
          call.type === "VIDEO" && phase === "connected"
            ? "absolute inset-0 w-full h-full object-cover bg-black"
            : "hidden"
        }
      />

      {/* Caller identity — hidden behind remote video once the peer's stream arrives */}
      {!(call.type === "VIDEO" && remoteJoined) && (
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className={phase !== "connected" ? "animate-pulse" : ""}>
            <Avatar src={peerAvatar} name={peerName} className="w-28 h-28 border-2 border-white/20" />
          </div>
          <h2 className="text-2xl font-bold">{peerName}</h2>
          <p className="text-sm text-zinc-400">{statusLine}</p>
          {error && <p className="text-sm font-semibold text-red-400 max-w-xs text-center">{error}</p>}
        </div>
      )}

      {/* Local preview (video calls only) */}
      {call.type === "VIDEO" && phase === "connected" && (
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden object-cover bg-zinc-900 ring-1 ring-white/20 shadow-soft-lg z-10"
        />
      )}

      {/* Connected: timer overlay above the video */}
      {call.type === "VIDEO" && remoteJoined && (
        <div className="absolute top-6 left-6 z-10 glass-strong rounded-full px-3 py-1.5 text-sm font-semibold">
          {mmss}
        </div>
      )}

      {/* ---- Controls ---- */}
      <div className="absolute bottom-12 z-10 flex items-center gap-5">
        {phase === "incoming" ? (
          <>
            <button
              onClick={() => handleHangUp("REJECTED")}
              disabled={busy}
              title="Отклонить"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <button
              onClick={handleAccept}
              disabled={busy}
              title="Принять"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-60 animate-pulse"
            >
              <Phone className="w-7 h-7" />
            </button>
          </>
        ) : (
          <>
            {phase === "connected" && (
              <button
                onClick={toggleMic}
                title={micOn ? "Выключить микрофон" : "Включить микрофон"}
                className="w-14 h-14 rounded-full glass-strong flex items-center justify-center transition active:scale-95 cursor-pointer"
              >
                {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6 text-red-400" />}
              </button>
            )}

            <button
              onClick={() => handleHangUp("ENDED")}
              disabled={busy}
              title={phase === "outgoing" ? "Сбросить" : "Положить трубку"}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            {phase === "connected" && call.type === "VIDEO" && (
              <button
                onClick={toggleCam}
                title={camOn ? "Выключить камеру" : "Включить камеру"}
                className="w-14 h-14 rounded-full glass-strong flex items-center justify-center transition active:scale-95 cursor-pointer"
              >
                {camOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6 text-red-400" />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
