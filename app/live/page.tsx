"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { Radio, X, Send, Eye, Heart } from "lucide-react";
import { RootState } from "../store/store";
import { api, getFullImageUrl } from "../services/api";
import Avatar from "../components/Avatar";

interface LiveComment {
  id: string;
  username: string;
  avatar: string;
  text: string;
}

/**
 * Live video (simulated — section D). Text + viewer-count only; there is no real
 * RTC stream behind this. The chrome is built as if a stream will slot in later.
 */
export default function LivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const watchSession = searchParams.get("session");
  const { currentUser } = useSelector((state: RootState) => state.auth);

  const isBroadcaster = !watchSession;
  const [sessionId, setSessionId] = useState<string | null>(watchSession);
  const [title, setTitle] = useState("");
  const [started, setStarted] = useState(!!watchSession);
  const [busy, setBusy] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [draft, setDraft] = useState("");
  const [ended, setEnded] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Broadcaster starts the session.
  const handleStart = async () => {
    setBusy(true);
    try {
      const res: any = await api.live.startLive(title.trim() || undefined);
      const sid = res?.sessionId || res?.id || res?.data?.sessionId;
      setSessionId(sid);
      setStarted(true);
    } catch (err) {
      console.error("Failed to start live:", err);
    } finally {
      setBusy(false);
    }
  };

  // Viewer joins on mount.
  useEffect(() => {
    if (watchSession) {
      api.live.joinLive(watchSession).catch(() => {});
      return () => { api.live.leaveLive(watchSession).catch(() => {}); };
    }
  }, [watchSession]);

  // Poll comments + viewer count every ~2s while live.
  useEffect(() => {
    if (!sessionId || !started || ended) return;
    let active = true;
    const poll = async () => {
      try {
        const [list, lives] = await Promise.all([
          api.live.getLiveComments(sessionId),
          api.live.getActiveLives(),
        ]);
        if (!active) return;
        setComments((list || []).map((c: any) => ({
          id: String(c.id ?? c.commentId ?? Math.random()),
          username: c.userName || c.username || "user",
          avatar: getFullImageUrl(c.userAvatar || c.avatar),
          text: c.text || c.comment || "",
        })));
        const mine = (lives || []).find((l: any) => (l.sessionId || l.id) === sessionId);
        if (mine) setViewerCount(mine.viewerCount ?? mine.viewers ?? 0);
        else if (watchSession) setEnded(true); // host ended the stream
      } catch { /* ignore */ }
    };
    poll();
    const t = setInterval(poll, 2000);
    return () => { active = false; clearInterval(t); };
  }, [sessionId, started, ended, watchSession]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comments]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !sessionId) return;
    const text = draft.trim();
    setDraft("");
    // Optimistic append; the poll will reconcile.
    setComments((prev) => [...prev, { id: `local-${Date.now()}`, username: currentUser?.username || "you", avatar: getFullImageUrl(currentUser?.avatar), text }]);
    try { await api.live.sendLiveComment(sessionId, text); } catch (err) { console.error(err); }
  };

  const handleEnd = async () => {
    if (sessionId) { try { await api.live.endLive(sessionId); } catch (err) { console.error(err); } }
    router.push("/");
  };

  // --- Start screen (broadcaster, before going live) ---
  if (isBroadcaster && !started) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-10 flex flex-col items-center gap-6 text-black dark:text-white">
        <div className="w-20 h-20 rounded-full btn-grad flex items-center justify-center">
          <Radio className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-xl font-bold">Прямой эфир</h1>
        <p className="text-sm text-zinc-500 text-center">Начните трансляцию. Это текстовая симуляция — реального видеопотока нет.</p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название эфира (необязательно)"
          className="w-full bg-zinc-100 dark:bg-zinc-900 rounded-xl px-4 py-3 text-sm outline-none"
        />
        <button onClick={handleStart} disabled={busy} className="btn-primary w-full py-3 text-sm disabled:opacity-50">
          {busy ? "Запуск…" : "Начать эфир"}
        </button>
      </div>
    );
  }

  // --- Live screen (broadcaster live, or viewer watching) ---
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-zinc-900 to-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 pt-6">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 bg-[var(--like-red)] text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase">
            <Radio className="w-3.5 h-3.5" /> Live
          </span>
          <span className="flex items-center gap-1 bg-black/40 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            <Eye className="w-3.5 h-3.5" /> {viewerCount.toLocaleString()}
          </span>
        </div>
        <button onClick={isBroadcaster ? handleEnd : () => router.back()} className="text-white p-1.5 hover:bg-white/10 rounded-full cursor-pointer">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* "Video" area (simulated) */}
      <div className="flex-1 flex items-center justify-center text-white/50 text-sm">
        {ended ? "Эфир завершён" : isBroadcaster ? "Вы в эфире (симуляция)" : "Идёт прямой эфир (симуляция)"}
      </div>

      {/* Comments overlay */}
      <div className="px-4 pb-2 flex flex-col gap-2 max-h-[35vh] overflow-y-auto no-scrollbar">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2 text-white">
            <Avatar src={c.avatar} name={c.username} className="w-7 h-7 flex-shrink-0" />
            <p className="text-sm leading-snug">
              <span className="font-semibold mr-1.5">{c.username}</span>
              {c.text}
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      {!ended ? (
        <form onSubmit={handleSend} className="flex items-center gap-2 p-4">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Добавить комментарий…"
            className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-white text-sm outline-none placeholder-white/60"
          />
          <button type="submit" className="text-white p-2 hover:scale-110 transition cursor-pointer"><Send className="w-6 h-6" /></button>
          <button type="button" className="text-white p-2 cursor-pointer"><Heart className="w-6 h-6" /></button>
        </form>
      ) : (
        <div className="p-4">
          <button onClick={() => router.push("/")} className="btn-primary w-full py-3 text-sm">На главную</button>
        </div>
      )}
    </div>
  );
}
