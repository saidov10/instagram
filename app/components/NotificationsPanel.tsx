"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Heart, MessageCircle, UserPlus, UserCheck, X, Bell, CheckCheck } from "lucide-react";
import { RootState } from "../store/store";
import { api, getFullImageUrl } from "../services/api";
import SmartImage from "./SmartImage";
import Avatar from "./Avatar";

type NotificationType = "LIKE" | "COMMENT" | "FOLLOW" | "FOLLOW_REQUEST" | "FOLLOW_ACCEPT";

interface AppNotification {
  id: string;
  type: NotificationType;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  postId?: number;
  postImage?: string;
  text?: string;
  isRead: boolean;
  createdAt?: string;
}

interface PendingRequest {
  userId: string;
  username: string;
  avatar: string;
}

const TYPE_TEXT: Record<NotificationType, string> = {
  LIKE: "оценил(-а) вашу публикацию",
  COMMENT: "прокомментировал(-а) вашу публикацию",
  FOLLOW: "подписался(-ась) на вас",
  FOLLOW_REQUEST: "хочет подписаться на вас",
  FOLLOW_ACCEPT: "принял(-а) ваш запрос на подписку",
};

function TypeBadge({ type }: { type: NotificationType }) {
  const config: Record<NotificationType, { bg: string; icon: React.ReactNode }> = {
    LIKE: { bg: "bg-red-500", icon: <Heart className="w-2.5 h-2.5 text-white fill-white" /> },
    COMMENT: { bg: "bg-blue-500", icon: <MessageCircle className="w-2.5 h-2.5 text-white fill-white" /> },
    FOLLOW: { bg: "bg-violet-500", icon: <UserPlus className="w-2.5 h-2.5 text-white" /> },
    FOLLOW_REQUEST: { bg: "bg-amber-500", icon: <UserPlus className="w-2.5 h-2.5 text-white" /> },
    FOLLOW_ACCEPT: { bg: "bg-emerald-500", icon: <UserCheck className="w-2.5 h-2.5 text-white" /> },
  };
  const { bg, icon } = config[type];
  return (
    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${bg} flex items-center justify-center border-2 border-[var(--background)]`}>
      {icon}
    </span>
  );
}

/** Normalizes the many shapes the backend may use for a notification's sender/post. */
function mapNotification(n: any): AppNotification {
  const sender = n.sender || n.fromUser || n.user || n.actor || {};
  const rawType = String(n.type || n.notificationType || "FOLLOW").toUpperCase().replace(/[\s-]/g, "_");
  const type = (["LIKE", "COMMENT", "FOLLOW", "FOLLOW_REQUEST", "FOLLOW_ACCEPT"].includes(rawType)
    ? rawType
    : "FOLLOW") as NotificationType;

  return {
    id: String(n.id ?? n.notificationId ?? ""),
    type,
    senderId: sender.id || sender.userId || n.senderId || n.fromUserId || "",
    senderName: sender.userName || sender.username || n.senderName || n.userName || "user",
    senderAvatar: getFullImageUrl(sender.avatar || sender.imagePath || n.senderAvatar),
    postId: n.postId ?? n.post?.id,
    postImage: getFullImageUrl(
      n.postImage || n.post?.images?.[0] || n.post?.filePath || n.post?.imagePath || n.postPreview
    ),
    text: n.text || n.message || n.comment,
    isRead: !!(n.isRead ?? n.read ?? n.seen),
    createdAt: n.createAt || n.createdAt,
  };
}

export default function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { currentUser } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const [rawNotifs, pending] = await Promise.all([
        api.notification.getNotifications(1, 30),
        api.following.getPendingRequests().catch(() => []),
      ]);

      // FOLLOW_REQUEST notifications are dropped here: the pending-requests list below is the
      // authoritative, actionable source for them (it carries accept/reject).
      setNotifications(
        (rawNotifs || []).map(mapNotification).filter((n) => n.type !== "FOLLOW_REQUEST" && n.id)
      );

      setPendingRequests(
        (pending || []).map((r: any) => {
          const author = r.user || r.follower || r;
          return {
            userId: author.id || author.userId || r.followerId || "",
            username: author.userName || author.username || "user",
            avatar: getFullImageUrl(author.avatar || author.imagePath),
          };
        })
      );
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err?.message || "Не удалось загрузить уведомления.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || busy.markAll) return;
    setBusy((b) => ({ ...b, markAll: true }));
    const snapshot = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await api.notification.markAllAsRead();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      setNotifications(snapshot);
    } finally {
      setBusy((b) => ({ ...b, markAll: false }));
    }
  };

  const handleMarkRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    try {
      await api.notification.markAsRead(id);
    } catch (err) {
      console.error("Failed to mark as read:", err);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
    }
  };

  const handleDelete = async (id: string) => {
    if (busy[id]) return;
    setBusy((b) => ({ ...b, [id]: true }));
    const snapshot = notifications;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.notification.deleteNotification(id);
    } catch (err) {
      console.error("Failed to delete notification:", err);
      setNotifications(snapshot);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const respondToRequest = async (userId: string, accept: boolean) => {
    if (!userId || busy[`req-${userId}`]) return;
    setBusy((b) => ({ ...b, [`req-${userId}`]: true }));
    try {
      if (accept) await api.following.acceptFollowRequest(userId);
      else await api.following.rejectFollowRequest(userId);
      setPendingRequests((prev) => prev.filter((r) => r.userId !== userId));
    } catch (err) {
      console.error("Failed to respond to follow request:", err);
    } finally {
      setBusy((b) => ({ ...b, [`req-${userId}`]: false }));
    }
  };

  const isEmpty = !loading && !error && notifications.length === 0 && pendingRequests.length === 0;

  return (
    <div className="fixed inset-0 z-50 md:inset-auto md:z-30 flex flex-col w-full md:w-96 glass-strong md:glass h-screen md:sticky md:top-0 animate-in slide-in-from-left duration-300">
      <div className="flex justify-between items-center p-6 pb-4">
        <h2 className="text-2xl font-bold">Уведомления</h2>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={busy.markAll}
              title="Пометить все как прочитанные"
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg glass press cursor-pointer disabled:opacity-60"
            >
              <CheckCheck className="w-4 h-4" />
              Всё прочитано
            </button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
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
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 gap-3 py-10">
            <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
              <Bell className="w-7 h-7 stroke-[1.4px]" />
            </div>
            <span className="text-sm font-medium">{error}</span>
            <button onClick={load} className="text-blue-500 font-bold text-sm hover:text-blue-400 cursor-pointer">
              Повторить
            </button>
          </div>
        ) : isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 gap-3 py-10">
            <div className="w-16 h-16 rounded-full glass flex items-center justify-center">
              <Bell className="w-7 h-7 stroke-[1.4px]" />
            </div>
            <span className="text-sm font-medium">Пока нет уведомлений.</span>
            <span className="text-xs max-w-[220px]">Лайки, комментарии и новые подписчики появятся здесь.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* ---- Follow requests (actionable) ---- */}
            {pendingRequests.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2 px-2">Запросы на подписку</h3>
                <div className="flex flex-col">
                  {pendingRequests.map((r) => (
                    <div key={r.userId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <Link href={`/u/${r.userId}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar src={r.avatar} name={r.username} className="w-11 h-11 border border-[var(--border)]" />
                        <p className="text-sm min-w-0">
                          <span className="font-semibold">{r.username}</span>
                          <span className="text-zinc-500"> {TYPE_TEXT.FOLLOW_REQUEST}</span>
                        </p>
                      </Link>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => respondToRequest(r.userId, true)}
                          disabled={busy[`req-${r.userId}`]}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg btn-grad press cursor-pointer disabled:opacity-60"
                        >
                          Подтвердить
                        </button>
                        <button
                          onClick={() => respondToRequest(r.userId, false)}
                          disabled={busy[`req-${r.userId}`]}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg glass press cursor-pointer disabled:opacity-60"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ---- Everything else ---- */}
            {notifications.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-2 px-2">Все уведомления</h3>
                <div className="flex flex-col">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkRead(n.id)}
                      className={`group flex items-center gap-3 p-2 rounded-xl transition cursor-pointer ${
                        n.isRead ? "hover:bg-black/5 dark:hover:bg-white/5" : "bg-blue-500/8 hover:bg-blue-500/12"
                      }`}
                    >
                      {/* Unread dot */}
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.isRead ? "bg-transparent" : "bg-blue-500"}`} />

                      <Link
                        href={n.senderId ? `/u/${n.senderId}` : "#"}
                        onClick={onClose}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar src={n.senderAvatar} name={n.senderName} className="w-11 h-11 border border-[var(--border)]" />
                          <TypeBadge type={n.type} />
                        </div>
                        <p className="text-sm min-w-0">
                          <span className="font-semibold">{n.senderName}</span>
                          <span className="text-zinc-500"> {TYPE_TEXT[n.type]}</span>
                          {n.type === "COMMENT" && n.text && (
                            <span className="block text-xs text-zinc-400 truncate mt-0.5">«{n.text}»</span>
                          )}
                        </p>
                      </Link>

                      {n.postImage && (
                        <SmartImage src={n.postImage} alt="post" width={88} height={88} sizes="44px" className="w-11 h-11 rounded-lg object-cover shadow-soft flex-shrink-0" />
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(n.id);
                        }}
                        disabled={busy[n.id]}
                        title="Удалить уведомление"
                        className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition cursor-pointer flex-shrink-0 disabled:opacity-40"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
