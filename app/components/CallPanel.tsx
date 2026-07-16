"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { api, getFullImageUrl } from "../services/api";
import Avatar from "./Avatar";

export type CallType = "AUDIO" | "VIDEO";

/** A call session as returned by the backend. Field names are normalized here. */
export interface CallSession {
  callId: string;
  chatId: number;
  channelName: string;
  rtcToken: string;
  type: CallType;
  status: string;
  callerId: string;
  recipientId: string;
  appId?: string;
  uid?: string | number;
}

export function mapCall(raw: any): CallSession | null {
  if (!raw) return null;
  const callId = String(raw.callId ?? raw.id ?? "");
  if (!callId) return null;
  return {
    callId,
    chatId: raw.chatId ?? raw.chat?.id ?? 0,
    channelName: raw.channelName ?? raw.channel ?? "",
    rtcToken: raw.rtcToken ?? raw.token ?? "",
    type: (String(raw.type || "AUDIO").toUpperCase() === "VIDEO" ? "VIDEO" : "AUDIO") as CallType,
    status: String(raw.status || "RINGING").toUpperCase(),
    callerId: raw.callerId ?? raw.initiatorId ?? raw.callerUserId ?? "",
    recipientId: raw.recipientId ?? raw.receiverId ?? "",
    appId: raw.appId ?? raw.agoraAppId,
    uid: raw.uid,
  };
}

/** App ID comes from the backend's call payload when it supplies one, else from env. */
export const ENV_APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID || "";

const CHUNK_RELOAD_KEY = "agora-chunk-reloaded";

/**
 * Loads the Agora SDK lazily (it touches browser globals, so it must not run during SSR).
 *
 * The SDK lives in its own JS chunk. After a dev rebuild or a new deploy, a tab that's
 * still holding the old bundle asks for a chunk hash that no longer exists → "Failed to
 * load chunk". We retry a couple of times (covers a slow/transient fetch), then, if it's
 * genuinely a stale-chunk error, force a single page reload to pull the fresh chunk map.
 * A sessionStorage flag stops that reload from looping.
 */
async function loadAgoraRTC(retries = 2): Promise<any> {
  try {
    const mod = (await import("agora-rtc-sdk-ng")).default;
    if (typeof window !== "undefined") sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return mod;
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 500));
      return loadAgoraRTC(retries - 1);
    }
    const isChunkError =
      err?.name === "ChunkLoadError" || /loading chunk|failed to load chunk/i.test(err?.message || "");
    if (isChunkError && typeof window !== "undefined" && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      window.location.reload();
      // Hang so the caller doesn't surface an error before the reload takes effect.
      return new Promise<never>(() => {});
    }
    throw err;
  }
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

/** Turns raw Agora/getUserMedia errors into a message that says what to actually fix. */
function describeCallError(err: any): string {
  const name = err?.name || "";
  const code = err?.code || "";
  const msg = String(err?.message || "");

  if (msg.startsWith("__timeout__")) {
    return "Не удалось подключиться (истекло время). Проверьте доступ к микрофону и режим проекта Agora.";
  }
  if (name === "NotAllowedError" || code === "PERMISSION_DENIED" || /permission denied/i.test(msg)) {
    return "Доступ к микрофону/камере запрещён. Разрешите его в браузере (значок 🔒 в адресной строке) и повторите.";
  }
  if (name === "NotFoundError" || code === "DEVICE_NOT_FOUND") {
    return "Микрофон или камера не найдены на этом устройстве.";
  }
  if (/token|dynamic key|invalid vendor|CAN_NOT_GET|invalid_?token|-7|110/i.test(msg + code)) {
    return "Ошибка токена Agora. Проверьте: режим проекта (Testing mode не требует токен) или что бэкенд генерирует rtcToken с тем же App ID и App Certificate.";
  }
  return msg || "Не удалось подключиться к звонку.";
}

type Phase = "outgoing" | "incoming" | "connected";

interface CallPanelProps {
  call: CallSession;
  phase: Phase;
  peerName: string;
  peerAvatar?: string;
  onAccepted: () => void;
  onEnded: () => void;
}

/**
 * Full-screen call UI. Drives the Agora RTC lifecycle for the connected phase and
 * reports Accept / Reject / End back to the backend.
 */
export default function CallPanel({ call, phase, peerName, peerAvatar, onAccepted, onEnded }: CallPanelProps) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTracksRef = useRef<{ mic?: IMicrophoneAudioTrack; cam?: ICameraVideoTrack }>({});
  const remoteRef = useRef<HTMLDivElement | null>(null);
  const localRef = useRef<HTMLDivElement | null>(null);
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

  const appId = call.appId || ENV_APP_ID;

  /** Tears down Agora: unpublishes, closes local tracks, leaves the channel. */
  const leaveAgora = useCallback(async () => {
    const { mic, cam } = localTracksRef.current;
    mic?.stop();
    mic?.close();
    cam?.stop();
    cam?.close();
    localTracksRef.current = {};
    try {
      await clientRef.current?.leave();
    } catch {
      /* already gone */
    }
    clientRef.current = null;
    setJoined(false);
    setRemoteJoined(false);
  }, []);

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

  // ---- Agora join once we reach the connected phase ----
  useEffect(() => {
    if (phase !== "connected" || joinStartedRef.current) return;
    joinStartedRef.current = true;

    let cancelled = false;

    const join = async () => {
      if (!appId) {
        setError("Не задан Agora App ID (NEXT_PUBLIC_AGORA_APP_ID).");
        return;
      }
      if (!call.channelName) {
        setError("Бэкенд не вернул channelName для звонка.");
        return;
      }

      setJoining(true);
      setError(null);
      try {
        // Loaded lazily (with stale-chunk recovery): the SDK touches browser globals
        // and must not run during SSR.
        const AgoraRTC = await loadAgoraRTC();
        if (cancelled) return;

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
          await client.subscribe(user, mediaType);
          if (mediaType === "video" && remoteRef.current) {
            user.videoTrack?.play(remoteRef.current);
          }
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
          setRemoteJoined(true);
        });

        client.on("user-unpublished", () => setRemoteJoined(false));
        client.on("user-left", () => setRemoteJoined(false));

        // Joining the RTC channel can hang if the App ID/token/network is wrong —
        // time it out so the user sees a real error instead of a frozen "Подключение…".
        await withTimeout(
          client.join(appId, call.channelName, call.rtcToken || null, call.uid ?? null),
          15000,
          "join"
        );
        if (cancelled) return;

        // Acquiring mic/camera waits on the browser permission prompt; time it out too.
        if (call.type === "VIDEO") {
          const [mic, cam] = await withTimeout<[IMicrophoneAudioTrack, ICameraVideoTrack]>(
            AgoraRTC.createMicrophoneAndCameraTracks(),
            20000,
            "media"
          );
          if (cancelled) {
            mic.close();
            cam.close();
            return;
          }
          localTracksRef.current = { mic, cam };
          if (localRef.current) cam.play(localRef.current);
          await client.publish([mic, cam]);
        } else {
          const mic = await withTimeout<IMicrophoneAudioTrack>(
            AgoraRTC.createMicrophoneAudioTrack(),
            20000,
            "media"
          );
          if (cancelled) {
            mic.close();
            return;
          }
          localTracksRef.current = { mic };
          await client.publish([mic]);
        }

        if (!cancelled) setJoined(true);
      } catch (err: any) {
        console.error("Agora join failed:", err);
        if (!cancelled) setError(describeCallError(err));
      } finally {
        if (!cancelled) setJoining(false);
      }
    };

    join();

    return () => {
      cancelled = true;
    };
  }, [phase, appId, call.channelName, call.rtcToken, call.type, call.uid]);

  // Always release the mic/camera when this panel unmounts.
  useEffect(() => {
    return () => {
      leaveAgora();
    };
  }, [leaveAgora]);

  // ---- Actions ----
  const handleAccept = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.chat.respondToCall({ callId: call.callId, status: "ACCEPTED" });
      onAccepted();
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
      await leaveAgora();
      setBusy(false);
      onEnded();
    }
  };

  const toggleMic = async () => {
    const mic = localTracksRef.current.mic;
    if (!mic) return;
    await mic.setEnabled(!micOn);
    setMicOn((v) => !v);
  };

  const toggleCam = async () => {
    const cam = localTracksRef.current.cam;
    if (!cam) return;
    await cam.setEnabled(!camOn);
    setCamOn((v) => !v);
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
        src="data:audio/wav;base64,UklGRiQEAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAEAAAAAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8AAAAAgD+AP4A/gD8AAAAAgL+Av4C/gL8="
      />

      {/* Remote video fills the screen when connected */}
      {call.type === "VIDEO" && phase === "connected" && (
        <div ref={remoteRef} id="remote-player" className="absolute inset-0 bg-black" />
      )}

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
        <div
          ref={localRef}
          className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden bg-zinc-900 ring-1 ring-white/20 shadow-soft-lg z-10"
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
