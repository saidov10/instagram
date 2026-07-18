"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { X, Eye, Send, Radio } from "lucide-react";
import { RootState } from "../../store/store";
import { api, getFullImageUrl } from "../../services/api";
import Avatar from "../../components/Avatar";
import { confirmDialog } from "../../lib/confirm";

interface LiveComment {
  id: string;
  userId: string;
  username: string;
  text: string;
}

export default function LiveRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sessionId = params?.id || "";
  const { currentUser } = useSelector((state: RootState) => state.auth);

  const [session, setSession] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [ending, setEnding] = useState(false);
  const joinedRef = useRef(false);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  const isHost = !!currentUser && session?.userId === currentUser.id;

  // Host-only camera self-preview. The backend's Live endpoints carry no Agora/RTC
  // credentials (unlike calls), so there's no channel to actually publish this feed to —
  // viewers still see the static avatar placeholder until that's added server-side.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    if (!isHost || cameraOff) {
      cameraStream?.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setCameraStream(stream);
        setCameraError(null);
      })
      .catch((err) => {
        console.error("Camera access failed:", err);
        setCameraError("Нет доступа к камере. Разрешите доступ в браузере и обновите страницу.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, cameraOff]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Locate the session among active lives (there's no single get-live-by-id endpoint).
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const loadSession = () => {
      api.live.getActiveLives()
        .then((list) => {
          if (cancelled) return;
          const found = (list || []).find((l: any) => l.id === sessionId);
          if (found) setSession(found);
          else if (!session) setNotFound(true);
        })
        .catch(() => {});
    };
    loadSession();
    const interval = setInterval(loadSession, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Join as a viewer once we know we're not the host; leave on unmount.
  useEffect(() => {
    if (!sessionId || !currentUser || isHost || joinedRef.current) return;
    joinedRef.current = true;
    api.live.joinLive(sessionId).catch(() => {});
    return () => {
      api.live.leaveLive(sessionId).catch(() => {});
    };
  }, [sessionId, currentUser, isHost]);

  // Poll comments.
  useEffect(() => {
    if (!sessionId) return;
    const load = () => {
      api.live.getLiveComments(sessionId)
        .then((list) =>
          setComments(
            (list || []).map((c: any) => ({
              id: c.id,
              userId: c.userId || "",
              username: c.userName || c.username || "user",
              text: c.text || "",
            }))
          )
        )
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInput.trim();
    if (!text) return;
    setCommentInput("");
    try {
      await api.live.sendLiveComment(sessionId, text);
      setComments((prev) => [...prev, { id: `local-${Date.now()}`, userId: currentUser?.id || "", username: currentUser?.username || "you", text }]);
    } catch (err) {
      console.error("Failed to send live comment:", err);
    }
  };

  const handleEndLive = async () => {
    if (ending) return;
    if (!(await confirmDialog({ message: "Завершить прямой эфир?", confirmText: "Завершить", destructive: true }))) return;
    setEnding(true);
    try {
      await api.live.endLive(sessionId);
      router.push("/");
    } catch (err) {
      console.error("Failed to end live:", err);
      setEnding(false);
    }
  };

  if (notFound) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 text-white p-6 text-center">
        <h2 className="text-xl font-bold">Эфир завершён</h2>
        <Link href="/" className="btn-primary px-5 py-2.5 text-sm">На главную</Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col text-white select-none">
      {/* Host sees their own camera; viewers see a placeholder — the backend issues no
          broadcast channel for Live sessions, so there's nowhere to publish this feed to yet. */}
      <div className="flex-1 relative flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black overflow-hidden">
        {isHost && cameraStream ? (
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        ) : (
          <Avatar src={getFullImageUrl(session?.userAvatar)} name={session?.userName} className="w-24 h-24 opacity-80" />
        )}
        {isHost && cameraError && (
          <div className="absolute inset-x-6 bottom-24 text-center text-xs text-white bg-black/60 rounded-lg py-2 px-3">
            {cameraError}
          </div>
        )}
        {isHost && (
          <button
            onClick={() => setCameraOff((v) => !v)}
            className="absolute bottom-4 left-4 text-xs font-bold bg-black/50 hover:bg-black/70 px-3.5 py-2 rounded-full cursor-pointer"
          >
            {cameraOff ? "Включить камеру" : "Выключить камеру"}
          </button>
        )}

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2.5">
            <Avatar src={getFullImageUrl(session?.userAvatar)} name={session?.userName} className="w-9 h-9 border border-white" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{session?.userName}</span>
              {session?.title && <span className="text-xs text-white/70">{session.title}</span>}
            </div>
            <span className="flex items-center gap-1 bg-red-500 rounded px-2 py-0.5 text-[10px] font-bold ml-1">
              <Radio className="w-2.5 h-2.5" /> LIVE
            </span>
            <span className="flex items-center gap-1 bg-black/50 rounded-full px-2.5 py-1 text-xs font-semibold">
              <Eye className="w-3.5 h-3.5" /> {session?.viewerCount ?? session?.viewerIds?.length ?? 0}
            </span>
          </div>

          {isHost ? (
            <button
              onClick={handleEndLive}
              disabled={ending}
              className="text-xs font-bold bg-white text-black px-3.5 py-1.5 rounded-full cursor-pointer disabled:opacity-60"
            >
              {ending ? "..." : "Завершить"}
            </button>
          ) : (
            <button onClick={() => router.push("/")} className="p-1.5 hover:bg-white/10 rounded-full cursor-pointer">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Comments + input */}
      <div className="h-[35%] flex flex-col bg-gradient-to-t from-black to-transparent px-4 pb-4">
        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 py-2">
          {comments.map((c) => (
            <p key={c.id} className="text-sm">
              <span className="font-bold mr-1.5">{c.username}</span>
              {c.text}
            </p>
          ))}
          <div ref={commentsEndRef} />
        </div>
        <form onSubmit={handleSendComment} className="flex items-center gap-2">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Написать комментарий..."
            className="flex-1 bg-white/10 border border-white/20 focus:border-white/50 rounded-full px-4 py-2.5 text-sm outline-none placeholder-white/50"
          />
          <button
            type="submit"
            disabled={!commentInput.trim()}
            className="w-10 h-10 rounded-full bg-blue-500 disabled:opacity-40 flex items-center justify-center cursor-pointer flex-shrink-0"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
