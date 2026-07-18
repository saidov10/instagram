"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { api, getFullImageUrl } from "../services/api";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";

interface Liker {
  id: string;
  userName: string;
  fullName?: string;
  avatar: string;
  isVerified?: boolean;
  isFollowing?: boolean;
}

/**
 * Standard follower-style list opened by tapping a like count.
 * Pass `postId` for a post's likers, or `commentId` for a comment's likers — same shape/UX.
 */
export default function LikersListModal({
  postId,
  commentId,
  onClose,
}: {
  postId?: number;
  commentId?: number;
  onClose: () => void;
}) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const fetcher =
      commentId != null ? api.post.getCommentLikers(commentId) : api.post.getLikers(postId!);
    fetcher
      .then((list) => {
        if (cancelled) return;
        setLikers(
          (list || []).map((u: any) => ({
            id: u.id || u.userId,
            userName: u.userName || u.username || "user",
            fullName: u.fullName || u.name || "",
            avatar: getFullImageUrl(u.avatar),
            isVerified: !!u.isVerified,
            isFollowing: !!u.isFollowing,
          }))
        );
      })
      .catch(() => setLikers([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [postId, commentId]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-6" />
          <h3 className="font-bold text-base">Отметки «Нравится»</h3>
          <button onClick={onClose} className="hover:opacity-70 cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[400px] p-4 flex flex-col gap-4.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full shimmer" />
                <div className="flex flex-col gap-2">
                  <div className="w-28 h-3 rounded-full shimmer" />
                  <div className="w-20 h-2.5 rounded-full shimmer" />
                </div>
              </div>
            ))
          ) : likers.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-8">Пока никто не отметил «Нравится».</p>
          ) : (
            likers.map((user) => (
              <Link
                key={user.id}
                href={`/u/${user.id}`}
                onClick={onClose}
                className="flex items-center justify-between hover:opacity-80 transition"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={user.avatar} name={user.userName} className="w-10 h-10 border border-zinc-200 dark:border-zinc-800" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-sm leading-none flex items-center gap-1">
                      {user.userName}
                      {user.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-xs text-zinc-400 leading-none mt-1">{user.fullName}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
