"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  X,
  Send,
  Bookmark,
  Smile,
  Search
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { api, getFullImageUrl } from "../services/api";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";

interface ExploreItem {
  id: number;
  userId: string;
  image: string;
  isVideo: boolean;
  likes: number;
  commentsCount: number;
  spanClass?: string;
  username: string;
  avatar: string;
  caption: string;
  isLiked: boolean;
  comments: { username: string; text: string }[];
}

// Repeating pattern that makes a couple of tiles large, like the real Explore grid
const SPAN_PATTERN = [4, 8];

export default function ExplorePage() {
  const { currentUser } = useSelector((state: RootState) => state.auth);
  const [selectedItem, setSelectedItem] = useState<ExploreItem | null>(null);
  const [newComment, setNewComment] = useState("");
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const posts = await api.post.getPosts({ pageSize: 30 });
        const myId = currentUser?.id || "";
        const mapped: ExploreItem[] = (posts || []).map((p: any, idx: number) => {
          const img = getFullImageUrl((p.images && p.images[0]) || p.filePath || p.imagePath || p.image) || DEFAULT_AVATAR;
          const likeArr: string[] = Array.isArray(p.likes) ? p.likes : [];
          return {
            id: p.id || p.postId,
            userId: p.userId || "",
            image: img,
            isVideo: /\.(mp4|mov|webm)$/i.test(img),
            likes: typeof p.likeCount === "number" ? p.likeCount : likeArr.length,
            commentsCount: p.commentCount || 0,
            spanClass: SPAN_PATTERN.includes(idx % 10) ? "md:row-span-2 md:col-span-2" : "",
            username: p.userName || p.username || "user",
            avatar: getFullImageUrl(p.userAvatar || p.userImage) || DEFAULT_AVATAR,
            caption: p.content || p.title || "",
            isLiked: myId ? likeArr.includes(myId) : false,
            comments: [],
          };
        });
        setItems(mapped);
      } catch (err) {
        console.error(err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser?.id]);

  const handleLike = (id: number) => {
    api.post.likePost(id).catch((e) => console.error(e));
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const liked = !item.isLiked;
        const updated = { ...item, isLiked: liked, likes: liked ? item.likes + 1 : item.likes - 1 };
        if (selectedItem?.id === id) setSelectedItem(updated);
        return updated;
      })
    );
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !newComment.trim()) return;
    api.post.addComment({ postId: selectedItem.id, comment: newComment.trim() }).catch((err) => console.error(err));
    const updated = {
      ...selectedItem,
      commentsCount: selectedItem.commentsCount + 1,
      comments: [...selectedItem.comments, { username: currentUser?.username || "user", text: newComment.trim() }],
    };
    setItems((prev) => prev.map((item) => (item.id === selectedItem.id ? updated : item)));
    setSelectedItem(updated);
    setNewComment("");
  };

  return (
    <div className="w-full max-w-[975px] mx-auto px-4 py-4 md:py-8 flex flex-col gap-6 bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">

      {/* Mobile Search Bar */}
      <div className="md:hidden relative flex items-center">
        <Search className="absolute left-3 w-4.5 h-4.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Поиск"
          className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 outline-none rounded-lg pl-10 pr-4 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-1 md:gap-2 auto-rows-[120px] sm:auto-rows-[180px] md:auto-rows-[290px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-zinc-200 dark:bg-zinc-900 rounded-sm animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold">Пока нечего показать</h3>
          <p className="text-sm text-zinc-500 max-w-xs">Публикации появятся здесь, когда их создадут.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-2 auto-rows-[120px] sm:auto-rows-[180px] md:auto-rows-[290px]">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`group relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 rounded-xl md:rounded-2xl lift shadow-soft cursor-pointer ${item.spanClass || ""}`}
            >
              {item.isVideo ? (
                <video src={item.image} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img
                  src={item.image}
                  alt="Explore post"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-6 text-white font-semibold transition duration-200">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-6 h-6 fill-white text-white" />
                  {item.likes}
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-6 h-6 fill-white text-white" />
                  {item.commentsCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ----------------- POST DETAILS MODAL ----------------- */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2 z-55"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="glass-strong w-full max-w-lg md:max-w-5xl rounded-3xl shadow-soft-lg flex flex-col md:flex-row overflow-hidden max-h-[85vh] animate-pop-in">

            {/* Media */}
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-2 min-h-[300px]">
              {selectedItem.isVideo ? (
                <video src={selectedItem.image} className="w-full h-full max-h-[40vh] md:max-h-[75vh] object-contain" controls autoPlay loop />
              ) : (
                <img
                  src={selectedItem.image}
                  alt="Post Media"
                  className="w-full h-full max-h-[40vh] md:max-h-[75vh] object-contain select-none"
                  onDoubleClick={() => handleLike(selectedItem.id)}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900 h-[45vh] md:h-auto">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <Link href={selectedItem.userId ? `/u/${selectedItem.userId}` : "#"} className="flex items-center gap-3">
                  <img src={selectedItem.avatar} alt={selectedItem.username} className="w-8 h-8 rounded-full object-cover" />
                  <span className="font-semibold text-sm hover:underline cursor-pointer">{selectedItem.username}</span>
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {selectedItem.caption && (
                  <div className="flex gap-3">
                    <img src={selectedItem.avatar} alt={selectedItem.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-bold mr-2">{selectedItem.username}</span>
                      <span className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{selectedItem.caption}</span>
                    </div>
                  </div>
                )}
                {selectedItem.comments.map((comment, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center text-xs font-bold uppercase">
                      {comment.username.slice(0, 2)}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold mr-2">{comment.username}</span>
                      <span className="text-zinc-800 dark:text-zinc-200">{comment.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-4">
                    <button onClick={() => handleLike(selectedItem.id)}>
                      <Heart className={`w-6 h-6 ${selectedItem.isLiked ? "text-red-500 fill-red-500" : "text-zinc-800 dark:text-zinc-250 hover:text-zinc-500"}`} />
                    </button>
                    <button><MessageCircle className="w-6 h-6 text-zinc-800 dark:text-zinc-250" /></button>
                    <button><Send className="w-6 h-6 text-zinc-800 dark:text-zinc-250" /></button>
                  </div>
                  <button><Bookmark className="w-6 h-6 text-zinc-800 dark:text-zinc-250" /></button>
                </div>
                <p className="text-sm font-bold">{selectedItem.likes.toLocaleString()} отметок «Нравится»</p>
              </div>

              <form onSubmit={handleAddComment} className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button type="button" className="text-zinc-750 dark:text-zinc-250 hover:text-zinc-500">
                    <Smile className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    placeholder="Добавьте комментарий..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-transparent text-sm w-full outline-none placeholder-zinc-400 border-none ring-0 p-0 text-zinc-900 dark:text-white"
                  />
                </div>
                {newComment.trim() && (
                  <button type="submit" className="text-blue-500 font-semibold text-sm hover:text-blue-600 px-1 cursor-pointer">
                    Опубликовать
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
