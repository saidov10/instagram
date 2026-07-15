"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Hash, Heart, MessageCircle, X, ChevronLeft } from "lucide-react";
import { api, getFullImageUrl } from "../../../services/api";
import Avatar from "../../../components/Avatar";
import SmartImage from "../../../components/SmartImage";
import HashtagText from "../../../components/HashtagText";

interface TagPost {
  id: number;
  userId: string;
  username: string;
  avatar: string;
  image: string;
  isVideo: boolean;
  likes: number;
  commentsCount: number;
  caption: string;
}

export default function HashtagPage() {
  const params = useParams<{ tag: string }>();
  const router = useRouter();
  // The segment arrives percent-encoded for non-latin tags (e.g. #реакт).
  const tag = decodeURIComponent(params?.tag || "");

  const [posts, setPosts] = useState<TagPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TagPost | null>(null);

  useEffect(() => {
    if (!tag) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const raw = await api.post.getByHashtag(tag);
        if (cancelled) return;
        const mapped: TagPost[] = (raw || []).map((p: any) => {
          const img = getFullImageUrl((p.images && p.images[0]) || p.filePath || p.imagePath || p.image);
          return {
            id: p.id || p.postId,
            userId: p.userId || "",
            username: p.userName || p.username || "user",
            avatar: getFullImageUrl(p.userAvatar || p.userImage),
            image: img,
            isVideo: /\.(mp4|mov|webm)$/i.test(img),
            likes: typeof p.likeCount === "number" ? p.likeCount : Array.isArray(p.likes) ? p.likes.length : 0,
            commentsCount: p.commentCount || 0,
            caption: p.content || p.title || p.caption || "",
          };
        });
        setPosts(mapped);
      } catch (err) {
        console.error("Failed to load hashtag posts:", err);
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [tag]);

  return (
    <div className="w-full max-w-[975px] mx-auto px-4 py-4 md:py-8 flex flex-col gap-8 text-black dark:text-white">

      {/* Header */}
      <div className="flex items-center gap-4 md:gap-6">
        <button
          onClick={() => router.back()}
          className="md:hidden p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center flex-shrink-0">
          <Hash className="w-9 h-9 md:w-12 md:h-12" />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-xl md:text-3xl font-light truncate">#{tag}</h1>
          <p className="text-sm text-zinc-500">
            {loading ? "Загрузка..." : `${posts.length} ${posts.length === 1 ? "публикация" : "публикаций"}`}
          </p>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-1 md:gap-2 auto-rows-[120px] sm:auto-rows-[180px] md:auto-rows-[290px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-zinc-200 dark:bg-zinc-900 rounded-sm animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
            <Hash className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold">Публикаций пока нет</h3>
          <p className="text-sm text-zinc-500 max-w-xs">
            По тегу #{tag} ещё ничего не опубликовали.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-2 auto-rows-[120px] sm:auto-rows-[180px] md:auto-rows-[290px]">
          {posts.map((post) => (
            <div
              key={post.id}
              onClick={() => setSelected(post)}
              className="group relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 rounded-xl md:rounded-2xl lift shadow-soft cursor-pointer"
            >
              {post.isVideo ? (
                <video src={post.image} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <SmartImage
                  src={post.image}
                  alt={`#${tag}`}
                  fill
                  sizes="(max-width: 768px) 33vw, 300px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-6 text-white font-semibold transition duration-200">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-6 h-6 fill-white text-white" />
                  {post.likes}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-6 h-6 fill-white text-white" />
                  {post.commentsCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post preview */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelected(null)}
        >
          <button
            onClick={() => setSelected(null)}
            className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2"
          >
            <X className="w-8 h-8" />
          </button>

          <div
            className="glass-strong w-full max-w-lg md:max-w-4xl rounded-3xl shadow-soft-lg flex flex-col md:flex-row overflow-hidden max-h-[85vh] animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-2 min-h-[300px]">
              {selected.isVideo ? (
                <video src={selected.image} className="w-full max-h-[40vh] md:max-h-[75vh] object-contain" controls autoPlay loop />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- lightbox preserves the remote image's natural aspect ratio
                <img src={selected.image} alt="" className="w-full max-h-[40vh] md:max-h-[75vh] object-contain" />
              )}
            </div>

            <div className="w-full md:w-[360px] border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900">
              <Link
                href={selected.userId ? `/u/${selected.userId}` : "#"}
                className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800"
              >
                <Avatar src={selected.avatar} name={selected.username} className="w-8 h-8" />
                <span className="font-semibold text-sm hover:underline">{selected.username}</span>
              </Link>

              <div className="flex-1 overflow-y-auto p-4 text-sm">
                {selected.caption && (
                  <p className="whitespace-pre-wrap break-words">
                    <span className="font-bold mr-2">{selected.username}</span>
                    <HashtagText text={selected.caption} className="text-zinc-800 dark:text-zinc-200" />
                  </p>
                )}
              </div>

              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Heart className="w-5 h-5" /> {selected.likes}
                </span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <MessageCircle className="w-5 h-5" /> {selected.commentsCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
