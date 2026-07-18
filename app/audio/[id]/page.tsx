"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Music, Play, Bookmark } from "lucide-react";
import { api, getFullImageUrl } from "../../services/api";
import Avatar from "../../components/Avatar";
import SmartImage from "../../components/SmartImage";

interface AudioReel {
  id: number;
  userId: string;
  username: string;
  avatar: string;
  thumbnail: string;
}

export default function AudioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const audioId = decodeURIComponent(params?.id || "");

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [reels, setReels] = useState<AudioReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!audioId) return;
    let cancelled = false;
    api.post
      .getAudioDetails(audioId)
      .then((raw) => {
        if (cancelled) return;
        setTitle(raw.title || raw.audioName || "Аудио");
        setArtist(raw.artist || raw.audioArtist || "");
        setReels(
          (raw.reels || []).map((r: any) => ({
            id: r.id || r.postId,
            userId: r.userId || "",
            username: r.userName || r.username || "user",
            avatar: getFullImageUrl(r.userAvatar),
            thumbnail: getFullImageUrl((r.images && r.images[0]) || r.filePath || r.imagePath || r.image),
          }))
        );
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [audioId]);

  const handleSaveAudio = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await api.post.saveAudio(audioId, { title, artist });
      setSaved(true);
    } catch (err) {
      console.error("Failed to save audio:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 text-black dark:text-white">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="hover:opacity-60 cursor-pointer">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold">Аудио</h1>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 mb-6">
        <div className="w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <Music className="w-7 h-7 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{loading ? "Загрузка..." : title}</p>
          {artist && <p className="text-xs text-zinc-500 truncate">{artist}</p>}
          <p className="text-xs text-zinc-500 mt-1">{reels.length} Reels</p>
        </div>
        <button
          onClick={handleSaveAudio}
          disabled={saving || saved}
          className="p-2.5 rounded-full glass hover:shadow-soft cursor-pointer disabled:opacity-60 flex-shrink-0"
          title={saved ? "Сохранено" : "Сохранить звук"}
        >
          <Bookmark className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-[9/16] rounded-lg shimmer" />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-16">Пока никто не использовал этот звук.</p>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {reels.map((r) => (
            <Link key={r.id} href={`/reels?id=${r.id}`} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 group">
              <SmartImage src={r.thumbnail} alt="" fill sizes="150px" className="object-cover" />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                <Avatar src={r.avatar} name={r.username} className="w-5 h-5 border border-white" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
