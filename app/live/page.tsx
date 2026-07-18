"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Radio } from "lucide-react";
import { api } from "../services/api";

export default function GoLivePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const session = await api.live.startLive(title.trim() || undefined);
      router.push(`/live/${session.id}`);
    } catch (err: any) {
      setError(err?.message || "Не удалось начать трансляцию.");
      setStarting(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto px-4 py-8 flex flex-col gap-6 text-black dark:text-white">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="hover:opacity-60 cursor-pointer">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Прямой эфир</h1>
      </div>

      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <Radio className="w-9 h-9 text-red-500" />
        </div>
        <p className="text-sm text-zinc-500 text-center max-w-xs">
          Начните прямой эфир — подписчики увидят метку LIVE и смогут присоединиться и оставлять комментарии.
        </p>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название эфира (необязательно)"
        className="w-full bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm outline-none"
      />

      {error && <span className="text-xs text-red-500">{error}</span>}

      <button
        onClick={handleStart}
        disabled={starting}
        className="btn-primary py-3 text-sm font-bold disabled:opacity-60 cursor-pointer"
      >
        {starting ? "Запуск..." : "Начать эфир"}
      </button>
    </div>
  );
}
