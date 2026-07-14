"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Heart, UserPlus, X, Bell } from "lucide-react";
import { RootState } from "../store/store";
import { api, getFullImageUrl } from "../services/api";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";

interface FollowerNotif {
  userId: string;
  username: string;
  avatar: string;
  following: boolean;
}
interface LikeNotif {
  key: string;
  userId: string;
  username: string;
  avatar: string;
  postId: number;
  postImage: string;
}

export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { currentUser } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<FollowerNotif[]>([]);
  const [likes, setLikes] = useState<LikeNotif[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [myPosts, subscribers, subscriptions] = await Promise.all([
        api.post.getMyPosts().catch(() => []),
        api.following.getSubscribers(currentUser.id).catch(() => []),
        api.following.getSubscriptions(currentUser.id).catch(() => []),
      ]);

      const followingIds = new Set((subscriptions || []).map((s: any) => s.id || s.userId));

      // ---- New followers ----
      setFollowers(
        (subscribers || []).map((s: any) => {
          const uid = s.id || s.userId || "";
          return {
            userId: uid,
            username: s.userName || s.username || "user",
            avatar: getFullImageUrl(s.avatar || s.imagePath) || DEFAULT_AVATAR,
            following: followingIds.has(uid),
          };
        })
      );

      // ---- Likes on my posts (posts carry `likes: [userId]`) ----
      // Collect unique likers (excluding myself), keep the post they liked.
      const seen = new Set<string>();
      const likerToPost: { userId: string; postId: number; postImage: string }[] = [];
      for (const p of myPosts || []) {
        const arr: string[] = Array.isArray(p.likes) ? p.likes : [];
        const img = getFullImageUrl((p.images && p.images[0]) || p.filePath || p.image) || DEFAULT_AVATAR;
        for (const uid of arr) {
          if (uid === currentUser.id) continue;
          const k = `${uid}-${p.id}`;
          if (seen.has(k)) continue;
          seen.add(k);
          likerToPost.push({ userId: uid, postId: p.id || p.postId, postImage: img });
        }
      }

      // Resolve liker profiles (cap to keep it snappy on the slow backend)
      const capped = likerToPost.slice(0, 15);
      const cache: Record<string, { username: string; avatar: string }> = {};
      await Promise.all(
        Array.from(new Set(capped.map((l) => l.userId))).map(async (uid) => {
          try {
            const prof = await api.profile.getUserProfileById(uid);
            cache[uid] = {
              username: prof?.userName || "user",
              avatar: getFullImageUrl(prof?.avatar) || DEFAULT_AVATAR,
            };
          } catch {
            cache[uid] = { username: "user", avatar: DEFAULT_AVATAR };
          }
        })
      );

      setLikes(
        capped.map((l) => ({
          key: `${l.userId}-${l.postId}`,
          userId: l.userId,
          username: cache[l.userId]?.username || "user",
          avatar: cache[l.userId]?.avatar || DEFAULT_AVATAR,
          postId: l.postId,
          postImage: l.postImage,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  const followBack = async (n: FollowerNotif) => {
    if (!n.userId || busy[n.userId]) return;
    setBusy((b) => ({ ...b, [n.userId]: true }));
    setFollowers((prev) => prev.map((f) => (f.userId === n.userId ? { ...f, following: !f.following } : f)));
    try {
      if (n.following) await api.following.unfollow(n.userId);
      else await api.following.follow(n.userId);
    } catch {
      setFollowers((prev) => prev.map((f) => (f.userId === n.userId ? { ...f, following: n.following } : f)));
    } finally {
      setBusy((b) => ({ ...b, [n.userId]: false }));
    }
  };

  const isEmpty = !loading && followers.length === 0 && likes.length === 0;

  return (
    <div className="fixed inset-0 z-50 md:inset-auto md:z-30 flex flex-col w-full md:w-96 glass-strong md:glass h-screen md:sticky md:top-0 animate-in slide-in-from-left duration-300">
      <div className="flex justify-between items-center p-6 pb-4">
        <h2 className="text-2xl font-bold">Уведомления</h2>
        <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 no-scrollbar">
        {loading ? (
          <div className="flex flex-col gap-4 pt-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full shimmer" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="w-2/3 h-3 rounded-full shimmer" />
                  <div className="w-1/3 h-2.5 rounded-full shimmer" />
                </div>
                <div className="w-10 h-10 rounded-lg shimmer" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 gap-3 py-10">
            <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
              <Bell className="w-7 h-7 stroke-[1.4px]" />
            </div>
            <span className="text-sm font-medium">Пока нет уведомлений.</span>
            <span className="text-xs max-w-[220px]">Лайки на ваших публикациях и новые подписчики появятся здесь.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {followers.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2 px-2">Новые подписчики</h3>
                <div className="flex flex-col">
                  {followers.map((n) => (
                    <div key={n.userId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <Link href={`/u/${n.userId}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                        <img src={n.avatar} alt={n.username} className="w-11 h-11 rounded-full object-cover border border-[var(--border)]" />
                        <p className="text-sm min-w-0">
                          <span className="font-semibold">{n.username}</span>
                          <span className="text-zinc-500"> подписался(-ась) на вас</span>
                        </p>
                      </Link>
                      <button
                        onClick={() => followBack(n)}
                        disabled={busy[n.userId]}
                        className={`text-xs font-bold px-3.5 py-1.5 rounded-lg press cursor-pointer disabled:opacity-60 ${
                          n.following ? "glass" : "btn-grad"
                        }`}
                      >
                        {n.following ? "Вы подписаны" : "Подписаться"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {likes.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2 px-2">Отметки «Нравится»</h3>
                <div className="flex flex-col">
                  {likes.map((n) => (
                    <div key={n.key} className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <Link href={`/u/${n.userId}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <img src={n.avatar} alt={n.username} className="w-11 h-11 rounded-full object-cover border border-[var(--border)]" />
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border-2 border-[var(--background)]">
                            <Heart className="w-2.5 h-2.5 text-white fill-white" />
                          </span>
                        </div>
                        <p className="text-sm min-w-0">
                          <span className="font-semibold">{n.username}</span>
                          <span className="text-zinc-500"> оценил(-а) вашу публикацию</span>
                        </p>
                      </Link>
                      {n.postImage && (
                        <img src={n.postImage} alt="post" className="w-11 h-11 rounded-lg object-cover shadow-soft" />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
