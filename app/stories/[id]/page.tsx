"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Heart, Send, MoreHorizontal } from "lucide-react";

interface Story {
  id: number;
  username: string;
  avatar: string;
  image: string;
  time: string;
}

const STORIES: Story[] = [
  {
    id: 1,
    username: "traveler_joe",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=1400&fit=crop",
    time: "2 ч",
  },
  {
    id: 2,
    username: "foodie_chef",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=1400&fit=crop",
    time: "5 ч",
  },
  {
    id: 3,
    username: "creative_mind",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=1400&fit=crop",
    time: "8 ч",
  },
  {
    id: 4,
    username: "malrlll7",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&h=1400&fit=crop",
    time: "12 ч",
  },
];

const DURATION_MS = 5000;

export default function StoryViewerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const startIndex = Math.max(
    0,
    STORIES.findIndex((s) => String(s.id) === id)
  );

  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [liked, setLiked] = useState(false);

  const close = useCallback(() => router.push("/"), [router]);

  const goNext = useCallback(() => {
    setLiked(false);
    setProgress(0);
    setIndex((i) => {
      if (i >= STORIES.length - 1) {
        close();
        return i;
      }
      return i + 1;
    });
  }, [close]);

  const goPrev = useCallback(() => {
    setLiked(false);
    setProgress(0);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (paused) return;
    const step = 50;
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + (step / DURATION_MS) * 100;
        if (next >= 100) {
          goNext();
          return 0;
        }
        return next;
      });
    }, step);
    return () => clearInterval(timer);
  }, [paused, index, goNext]);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, close]);

  const story = STORIES[index];

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center select-none">
      {/* Close */}
      <button
        onClick={close}
        className="absolute top-5 right-5 z-30 text-white/80 hover:text-white transition cursor-pointer"
        aria-label="Закрыть"
      >
        <X className="w-7 h-7" />
      </button>

      {/* Prev arrow */}
      {index > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-4 md:left-16 z-30 w-9 h-9 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center hover:bg-white transition cursor-pointer"
          aria-label="Предыдущая история"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Story frame */}
      <div
        className="relative w-full max-w-[420px] h-full max-h-[92vh] rounded-lg overflow-hidden bg-black"
        onMouseDown={() => setPaused(true)}
        onMouseUp={() => setPaused(false)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
          {STORIES.map((s, i) => (
            <div
              key={s.id}
              className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width:
                    i < index ? "100%" : i === index ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-3 right-3 z-20 flex items-center gap-2.5 pt-2">
          <img
            src={story.avatar}
            alt={story.username}
            className="w-8 h-8 rounded-full object-cover border border-white/20"
          />
          <span className="text-white text-sm font-semibold">
            {story.username}
          </span>
          <span className="text-white/70 text-xs">{story.time}</span>
          <button className="ml-auto text-white/80 hover:text-white transition cursor-pointer">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* Image */}
        <img
          src={story.image}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* Tap zones */}
        <button
          onClick={goPrev}
          className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-default"
          aria-label="Назад"
        />
        <button
          onClick={goNext}
          className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-default"
          aria-label="Вперёд"
        />

        {/* Gradient + reply bar */}
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/70 to-transparent pt-12 pb-4 px-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setReply("");
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
              placeholder={`Ответить ${story.username}...`}
              className="flex-1 bg-transparent border border-white/40 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/60 outline-none focus:border-white transition"
            />
            <button
              type="button"
              onClick={() => setLiked((l) => !l)}
              className="text-white hover:opacity-70 transition cursor-pointer flex-shrink-0"
              aria-label="Нравится"
            >
              <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            </button>
            <button
              type="submit"
              className="text-white hover:opacity-70 transition cursor-pointer flex-shrink-0"
              aria-label="Отправить"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        </div>
      </div>

      {/* Next arrow */}
      {index < STORIES.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 md:right-16 z-30 w-9 h-9 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center hover:bg-white transition cursor-pointer"
          aria-label="Следующая история"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
