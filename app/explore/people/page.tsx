"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserPlus, ArrowLeft } from "lucide-react";

interface Suggestion {
  id: number;
  username: string;
  name: string;
  avatar: string;
  reason: string;
  followed: boolean;
}

export default function SuggestionsPage() {
  const router = useRouter();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      id: 1,
      username: "Ten_hood",
      name: "Teymur H.",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop",
      reason: "Подписаны: m.ibrohim и еще 3 человек",
      followed: false
    },
    {
      id: 2,
      username: "malrlll7",
      name: "Malika Rasulova",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop",
      reason: "Рекомендации для вас",
      followed: false
    },
    {
      id: 3,
      username: "#011",
      name: "Ali Sherov",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop",
      reason: "Подписаны: ilolov77 и еще 1 человек",
      followed: false
    },
    {
      id: 4,
      username: "amira_3o_",
      name: "Amira",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
      reason: "Подписан(-а): _abrorov",
      followed: false
    },
    {
      id: 5,
      username: "s.nazarov",
      name: "Siyovush Nazarov",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
      reason: "Новый аккаунт на Instagram",
      followed: false
    },
    {
      id: 6,
      username: "islom_id",
      name: "Ислам Идигов",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
      reason: "Рекомендовано вам",
      followed: false
    }
  ]);

  const handleFollowToggle = (id: number) => {
    setSuggestions((prev) =>
      prev.map((sug) => (sug.id === id ? { ...sug, followed: !sug.followed } : sug))
    );
  };

  return (
    <div className="w-full max-w-[600px] mx-auto px-4 py-8 select-none text-zinc-900 dark:text-zinc-100 min-h-[85vh]">
      
      {/* Header back navigation */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-1.5 hover:bg-zinc-150 dark:hover:bg-zinc-900 rounded-full transition cursor-pointer"
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
          {suggestions.map((sug) => (
            <div
              key={sug.id}
              className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-900/60 last:border-b-0"
            >
              <div className="flex items-center gap-4.5 min-w-0 flex-1">
                <img
                  src={sug.avatar}
                  alt={sug.username}
                  className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 flex-shrink-0"
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-bold text-sm hover:underline cursor-pointer truncate">
                    {sug.username}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-550 text-xs font-normal truncate">
                    {sug.name}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-450 text-[10px] truncate mt-0.5">
                    {sug.reason}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleFollowToggle(sug.id)}
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
          ))}
        </div>
      </div>

    </div>
  );
}
