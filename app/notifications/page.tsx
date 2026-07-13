"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface Activity {
  id: number;
  username: string;
  avatar: string;
  type: "like" | "comment" | "follow" | "mention";
  text: string;
  time: string;
  thumb?: string;
  followed?: boolean;
}

const GROUPS: { label: string; items: Activity[] }[] = [
  {
    label: "Сегодня",
    items: [
      {
        id: 1,
        username: "malrlll7",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop",
        type: "like",
        text: "оценил(-а) вашу публикацию.",
        time: "2 ч",
        thumb: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=120&h=120&fit=crop",
      },
      {
        id: 2,
        username: "s.nazarov",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
        type: "follow",
        text: "подписался(-ась) на вас.",
        time: "5 ч",
        followed: false,
      },
    ],
  },
  {
    label: "На этой неделе",
    items: [
      {
        id: 3,
        username: "traveler_joe",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop",
        type: "comment",
        text: "прокомментировал(-а): «Отличный кадр!»",
        time: "2 д",
        thumb: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=120&h=120&fit=crop",
      },
      {
        id: 4,
        username: "amira_3o_",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop",
        type: "mention",
        text: "упомянул(-а) вас в комментарии.",
        time: "3 д",
        thumb: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=120&h=120&fit=crop",
      },
      {
        id: 5,
        username: "islom_id",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop",
        type: "follow",
        text: "подписался(-ась) на вас.",
        time: "6 д",
        followed: true,
      },
    ],
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState(GROUPS);

  const toggleFollow = (id: number) => {
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        items: g.items.map((it) =>
          it.id === id ? { ...it, followed: !it.followed } : it
        ),
      }))
    );
  };

  return (
    <div className="w-full max-w-[600px] mx-auto px-4 py-8 select-none text-zinc-900 dark:text-zinc-100 min-h-[85vh]">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Уведомления</h1>
      </div>

      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="font-bold text-base mb-3">{group.label}</h2>
            <div className="flex flex-col">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 rounded-lg px-2 -mx-2 transition"
                >
                  <img
                    src={item.avatar}
                    alt={item.username}
                    className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 flex-shrink-0"
                  />

                  <p className="text-sm min-w-0 flex-1 leading-snug">
                    <span className="font-semibold hover:underline cursor-pointer">
                      {item.username}
                    </span>{" "}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {item.text}
                    </span>{" "}
                    <span className="text-zinc-400 dark:text-zinc-500">
                      {item.time}
                    </span>
                  </p>

                  {item.type === "follow" ? (
                    <button
                      onClick={() => toggleFollow(item.id)}
                      className={`font-semibold text-xs px-5 py-2 rounded-lg cursor-pointer transition flex-shrink-0 ${
                        item.followed
                          ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:opacity-80"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      }`}
                    >
                      {item.followed ? "Вы подписаны" : "Подписаться"}
                    </button>
                  ) : (
                    item.thumb && (
                      <img
                        src={item.thumb}
                        alt=""
                        className="w-11 h-11 object-cover rounded-md flex-shrink-0"
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
