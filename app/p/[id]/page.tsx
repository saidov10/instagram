"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Smile,
} from "lucide-react";

interface Comment {
  username: string;
  text: string;
}

interface Post {
  id: number;
  username: string;
  avatar: string;
  location: string;
  image: string;
  caption: string;
  likes: number;
  time: string;
  isLiked: boolean;
  isSaved: boolean;
  comments: Comment[];
}

const CURRENT_USERNAME = "saaidov.7";

const INITIAL_POSTS: Post[] = [
  {
    id: 1,
    username: "traveler_joe",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    location: "Swiss Alps, Switzerland",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=800&fit=crop",
    caption:
      "Morning views from the cabin. Unbelievable feeling being surrounded by these peaks!",
    likes: 1243,
    time: "2 часа назад",
    isLiked: false,
    isSaved: false,
    comments: [
      { username: "nature_explorer", text: "Wow, this looks breath-taking!" },
      { username: "alice_wonder", text: "Adding this to my bucket list!" },
    ],
  },
  {
    id: 2,
    username: "foodie_chef",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    location: "Tokyo, Japan",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=800&fit=crop",
    caption: "Crafting the perfect bowl of Tonkotsu Ramen.",
    likes: 890,
    time: "5 часов назад",
    isLiked: false,
    isSaved: false,
    comments: [{ username: "tokyo_eats", text: "Best ramen in town." }],
  },
  {
    id: 3,
    username: "creative_mind",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    location: "Design Studio, New York",
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=800&fit=crop",
    caption: "Experimenting with acrylic painting today.",
    likes: 412,
    time: "1 день назад",
    isLiked: false,
    isSaved: false,
    comments: [{ username: "brush_strokes", text: "Love the texture!" }],
  },
];

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [commentText, setCommentText] = useState("");

  const post = posts.find((p) => String(p.id) === id);

  if (!post) {
    return (
      <div className="w-full max-w-[600px] mx-auto px-4 py-20 text-center text-zinc-900 dark:text-zinc-100">
        <h1 className="text-xl font-bold mb-2">Публикация недоступна</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Возможно, ссылка неверна или публикация была удалена.
        </p>
        <button
          onClick={() => router.push("/")}
          className="text-blue-500 font-semibold text-sm hover:underline cursor-pointer"
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  const toggleLike = () => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, isLiked: !p.isLiked, likes: p.likes + (p.isLiked ? -1 : 1) }
          : p
      )
    );
  };

  const toggleSave = () => {
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isSaved: !p.isSaved } : p))
    );
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              comments: [...p.comments, { username: CURRENT_USERNAME, text }],
            }
          : p
      )
    );
    setCommentText("");
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 py-6 select-none text-zinc-900 dark:text-zinc-100">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-4 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition cursor-pointer text-sm font-semibold"
      >
        <ArrowLeft className="w-5 h-5" />
        Назад
      </button>

      <div className="flex flex-col md:flex-row bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        {/* Image */}
        <div className="md:w-[60%] bg-black flex items-center justify-center">
          <img
            src={post.image}
            alt={post.caption}
            className="w-full h-full max-h-[700px] object-contain"
          />
        </div>

        {/* Right column */}
        <div className="md:w-[40%] flex flex-col border-l border-zinc-200 dark:border-zinc-800">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800">
            <img
              src={post.avatar}
              alt={post.username}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold truncate">
                {post.username}
              </span>
              {post.location && (
                <span className="text-xs text-zinc-500 truncate">
                  {post.location}
                </span>
              )}
            </div>
            <button className="p-1 hover:opacity-60 transition cursor-pointer">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Caption + comments */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-h-[400px]">
            <div className="flex gap-3">
              <img
                src={post.avatar}
                alt={post.username}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
              <p className="text-sm leading-snug">
                <span className="font-semibold mr-1.5">{post.username}</span>
                {post.caption}
                <span className="block text-xs text-zinc-400 mt-1">
                  {post.time}
                </span>
              </p>
            </div>

            {post.comments.map((c, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
                <p className="text-sm leading-snug">
                  <span className="font-semibold mr-1.5">{c.username}</span>
                  {c.text}
                </p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleLike}
                className="hover:opacity-60 transition cursor-pointer"
                aria-label="Нравится"
              >
                <Heart
                  className={`w-6 h-6 ${
                    post.isLiked ? "fill-red-500 text-red-500" : ""
                  }`}
                />
              </button>
              <button className="hover:opacity-60 transition cursor-pointer">
                <MessageCircle className="w-6 h-6" />
              </button>
              <button className="hover:opacity-60 transition cursor-pointer">
                <Send className="w-6 h-6" />
              </button>
              <button
                onClick={toggleSave}
                className="ml-auto hover:opacity-60 transition cursor-pointer"
                aria-label="Сохранить"
              >
                <Bookmark
                  className={`w-6 h-6 ${post.isSaved ? "fill-current" : ""}`}
                />
              </button>
            </div>

            <span className="text-sm font-semibold">
              {post.likes.toLocaleString("ru-RU")} отметок «Нравится»
            </span>
            <span className="text-[10px] uppercase text-zinc-400">
              {post.time}
            </span>
          </div>

          {/* Add comment */}
          <form
            onSubmit={submitComment}
            className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-3"
          >
            <Smile className="w-6 h-6 text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Добавьте комментарий..."
              className="flex-1 bg-transparent outline-none text-sm placeholder-zinc-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="text-blue-500 font-semibold text-sm disabled:opacity-40 disabled:cursor-default cursor-pointer hover:text-blue-600 transition"
            >
              Опубликовать
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
