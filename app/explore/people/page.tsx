"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus, ArrowLeft } from "lucide-react";
import SmartImage from "../../components/SmartImage";
import { api, getFullImageUrl } from "../../services/api";

interface Suggestion {
  id: string | number;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  reason: string;
  followed: boolean;
}

const formatSuggestion = (u: any, idx: number): Suggestion => {
  const mutual = u.mutualFollowersCount ?? u.mutualFollowers ?? 0;
  return {
    id: u.id || u.userId || idx,
    userId: u.id || u.userId || "",
    username: u.userName || u.username || "user",
    name: u.name || u.fullName || "",
    avatar: getFullImageUrl(u.avatar || u.imagePath),
    reason:
      mutual > 0
        ? `${mutual} ${mutual === 1 ? "общий подписчик" : "общих подписчиков"}`
        : u.about || "Рекомендации для вас",
    followed: false,
  };
};

export default function SuggestionsPage() {
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const users = await api.user.getSuggestedUsers(20);
        if (active) setSuggestions((users || []).map(formatSuggestion));
      } catch (err) {
        console.error("Failed to load suggested users:", err);
        if (active) setSuggestions([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleFollowToggle = async (sug: Suggestion) => {
    // Optimistic flip; revert on failure.
    setSuggestions((prev) =>
      prev.map((s) => (s.id === sug.id ? { ...s, followed: !s.followed } : s))
    );
    try {
      if (sug.followed) {
        await api.following.unfollow(sug.userId);
      } else {
        await api.following.follow(sug.userId);
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
      setSuggestions((prev) =>
        prev.map((s) => (s.id === sug.id ? { ...s, followed: sug.followed } : s))
      );
    }
  };

  return (
    <div className="w-full max-w-[600px] mx-auto px-4 py-8 select-none text-zinc-900 dark:text-zinc-100 min-h-[85vh]">
      
      {/* Header back navigation */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-full transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Рекомендации</h1>
      </div>

      <div className="flex flex-col gap-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 select-none">
          <span className="font-semibold text-sm text-zinc-500 dark:text-zinc-400">
            Все рекомендации для вас
          </span>
        </div>

        <div className="flex flex-col">
          {loading ? (
            <p className="text-center text-sm text-zinc-400 py-16">Загрузка…</p>
          ) : suggestions.length === 0 ? (
            <p className="text-center text-sm text-zinc-400 py-16 px-6">
              Пока нет рекомендаций. Подпишитесь на кого-нибудь, чтобы получить персональные советы.
            </p>
          ) : (
            suggestions.map((sug) => (
            <div
              key={sug.id}
              className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-900/60 last:border-b-0"
            >
              <Link
                href={sug.userId ? `/u/${sug.userId}` : "#"}
                className="flex items-center gap-4.5 min-w-0 flex-1"
              >
                <SmartImage
                  src={sug.avatar}
                  alt={sug.username}
                  width={96}
                  height={96}
                  sizes="48px"
                  className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 flex-shrink-0"
                  fallback={
                    <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                  }
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-sm hover:underline cursor-pointer truncate">
                    {sug.username}
                  </span>
                  {sug.name && (
                    <span className="text-zinc-400 dark:text-zinc-600 text-xs font-normal truncate">
                      {sug.name}
                    </span>
                  )}
                  <span className="text-zinc-500 dark:text-zinc-500 text-[10px] truncate mt-0.5">
                    {sug.reason}
                  </span>
                </div>
              </Link>

              <button
                onClick={() => handleFollowToggle(sug)}
                className={`font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer transition select-none flex items-center gap-1.5 ${
                  sug.followed
                    ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:opacity-80"
                    : "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
                }`}
              >
                {sug.followed ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Подписки</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Подписаться</span>
                  </>
                )}
              </button>
            </div>
          ))
          )}
        </div>
      </div>

    </div>
  );
}
