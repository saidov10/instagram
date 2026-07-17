"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Music, Play } from "lucide-react";
import { api, getFullImageUrl } from "../../services/api";
import SmartImage from "../../components/SmartImage";
import { useApp } from "../../context/AppContext";

interface AudioReel {
  id: number;
  media: string;
  views: number;
}

/** Audio detail page (section D): every reel using a track, plus a "Use this audio" CTA. */
export default function AudioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const audioId = params?.id;
  const { setCreateOpen, setCreateType } = useApp();

  const [details, setDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!audioId) return;
    let active = true;
    api.post.getAudioDetails(audioId)
      .then((d) => { if (active) setDetails(d); })
      .catch(() => { if (active) setDetails(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [audioId]);

  const reels: AudioReel[] = (details?.reels || [])
    .map((r: any) => ({
      id: r.id || r.postId,
      media: getFullImageUrl(r.filePath || r.imagePath || (r.images && r.images[0]) || r.image),
      views: r.viewCount ?? r.views ?? 0,
    }))
    .sort((a: AudioReel, b: AudioReel) => b.views - a.views);

  return (
    <div className="w-full max-w-[935px] mx-auto px-4 py-6 text-black dark:text-white min-h-[85vh]">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-zinc-150 dark:hover:bg-zinc-900 rounded-full transition cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Аудио</h1>
      </div>

      {/* Track header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-2xl btn-grad flex items-center justify-center flex-shrink-0">
          <Music className="w-9 h-9 text-white" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xl font-bold truncate">{details?.title || "Оригинальный звук"}</span>
          <span className="text-sm text-zinc-500 truncate">{details?.artist || ""}</span>
          <span className="text-xs text-zinc-400 mt-1">{details?.reelsCount ?? reels.length} Reels</span>
        </div>
      </div>

      <button
        onClick={() => { setCreateType("reel"); setCreateOpen(true); }}
        className="btn-primary w-full max-w-xs py-2.5 text-sm mb-8"
      >
        Использовать этот звук
      </button>

      {loading ? (
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-zinc-200 dark:bg-zinc-900 rounded-sm animate-pulse" />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-16">Пока нет Reels с этим звуком.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {reels.map((r) => (
            <Link key={r.id} href="/reels" className="relative aspect-square overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900 group">
              {r.media && <SmartImage src={r.media} alt="" fill sizes="(max-width:768px) 33vw, 300px" className="object-cover" />}
              <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-white text-xs font-semibold drop-shadow">
                <Play className="w-3.5 h-3.5 fill-white" /> {r.views.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
