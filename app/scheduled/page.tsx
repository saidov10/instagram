"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, Trash2 } from "lucide-react";
import { api, getFullImageUrl } from "../services/api";
import SmartImage from "../components/SmartImage";
import { confirmDialog } from "../lib/confirm";

interface ScheduledPost {
  id: string;
  title: string;
  image: string;
  scheduledFor: string;
}

function useCountdown(target: string) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Публикуется…");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(h > 24 ? `${Math.floor(h / 24)} дн. ${h % 24} ч.` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);
  return label;
}

function ScheduledRow({ post, onCancel, onReschedule, busy }: { post: ScheduledPost; onCancel: () => void; onReschedule?: (iso: string) => void; busy: boolean }) {
  const countdown = useCountdown(post.scheduledFor);
  const [editing, setEditing] = useState(false);
  const [newTime, setNewTime] = useState(post.scheduledFor.slice(0, 16));

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
      {post.image && <SmartImage src={post.image} alt="" width={56} height={56} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{post.title || "Без подписи"}</p>
        <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
          <Clock className="w-3 h-3" /> {countdown}
        </p>
        {editing && onReschedule && (
          <div className="flex items-center gap-2 mt-2">
            <input
              type="datetime-local"
              value={newTime}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={(e) => setNewTime(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1 text-xs outline-none"
            />
            <button
              onClick={() => {
                onReschedule(new Date(newTime).toISOString());
                setEditing(false);
              }}
              className="text-xs font-bold text-blue-500 cursor-pointer"
            >
              Сохранить
            </button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
        {onReschedule && (
          <button onClick={() => setEditing((v) => !v)} disabled={busy} className="text-xs font-semibold text-blue-500 cursor-pointer disabled:opacity-50">
            Перенести
          </button>
        )}
        <button onClick={onCancel} disabled={busy} className="text-xs font-semibold text-red-500 cursor-pointer disabled:opacity-50 flex items-center gap-1">
          <Trash2 className="w-3 h-3" /> Отменить
        </button>
      </div>
    </div>
  );
}

export default function ScheduledPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [stories, setStories] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    // Both calls also auto-publish anything due server-side.
    Promise.all([
      api.post.getScheduledPosts().catch(() => []),
      api.story.getScheduledStories().catch(() => []),
    ])
      .then(([postList, storyList]) => {
        setPosts(
          (postList || []).map((p: any) => ({
            id: p.id || p.draftId,
            title: p.title || p.content || "",
            image: getFullImageUrl((p.images && p.images[0]) || p.image),
            scheduledFor: p.scheduledFor,
          }))
        );
        setStories(
          (storyList || []).map((s: any) => ({
            id: String(s.scheduledStoryId ?? s.id),
            title: s.isForCloseFriends ? "История · Близкие друзья" : "История",
            image: getFullImageUrl(s.image || s.fileName || s.filePath),
            scheduledFor: s.scheduledFor,
          }))
        );
      })
      .finally(() => setLoading(false));
  };

  // Calling get-scheduled-posts also auto-publishes any due posts server-side.
  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const setBusy = (id: string, val: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (val) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleCancel = async (id: string) => {
    if (!(await confirmDialog({ message: "Отменить публикацию? Она останется в черновиках.", confirmText: "Да", cancelText: "Нет", destructive: true }))) return;
    setBusy(id, true);
    try {
      await api.post.cancelSchedule(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to cancel schedule:", err);
    } finally {
      setBusy(id, false);
    }
  };

  const handleReschedule = async (id: string, iso: string) => {
    setBusy(id, true);
    try {
      await api.post.updateSchedule(id, iso);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, scheduledFor: iso } : p)));
    } catch (err) {
      console.error("Failed to reschedule:", err);
    } finally {
      setBusy(id, false);
    }
  };

  const handleCancelStory = async (id: string) => {
    if (!(await confirmDialog({ message: "Отменить запланированную историю?", confirmText: "Да", cancelText: "Нет", destructive: true }))) return;
    setBusy(id, true);
    try {
      await api.story.cancelScheduledStory(id);
      setStories((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to cancel scheduled story:", err);
    } finally {
      setBusy(id, false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 text-black dark:text-white">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="hover:opacity-60 cursor-pointer">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Запланированные публикации</h1>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-full h-20 rounded-xl shimmer" />
          ))}
        </div>
      ) : posts.length === 0 && stories.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-16">Нет запланированных публикаций.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.length > 0 && (
            <div className="flex flex-col gap-3">
              {posts.map((post) => (
                <ScheduledRow
                  key={post.id}
                  post={post}
                  busy={busyIds.has(post.id)}
                  onCancel={() => handleCancel(post.id)}
                  onReschedule={(iso) => handleReschedule(post.id, iso)}
                />
              ))}
            </div>
          )}
          {stories.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Истории</h2>
              {stories.map((story) => (
                <ScheduledRow
                  key={story.id}
                  post={story}
                  busy={busyIds.has(story.id)}
                  onCancel={() => handleCancelStory(story.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
