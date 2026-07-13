"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Smile,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { useApp, Comment, Post } from "./context/AppContext";

interface Story {
  id: number;
  username: string;
  avatar: string;
  image: string;
  viewed: boolean;
}

export default function HomeFeed() {
  const { currentUser, posts, setPosts } = useApp();

  // State for stories
  const [stories, setStories] = useState<Story[]>([
    { id: 1, username: "ahl1ddddd", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=1000&fit=crop", viewed: false },
    { id: 2, username: "yusufjonn_05", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=1000&fit=crop", viewed: false },
    { id: 3, username: "ahmadwood", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", image: "https://images.unsplash.com/photo-1472214222541-d510753a8707?w=600&h=1000&fit=crop", viewed: false },
    { id: 4, username: "_qurbonov_", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop", image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&h=1000&fit=crop", viewed: false },
    { id: 5, username: "nazarovl7l", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&h=1000&fit=crop", viewed: false },
    { id: 6, username: "o61.musso", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=1000&fit=crop", viewed: false }
  ]);

  // State for suggestions
  const [suggestions, setSuggestions] = useState([
    { id: 1, username: "Ten_hood", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop", subtitle: "Подписаны: m.ibrohim...", followed: false },
    { id: 2, username: "malrlll7", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop", subtitle: "Рекомендации для вас", followed: false },
    { id: 3, username: "#011", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop", subtitle: "Подписаны: ilolov77...", followed: false },
    { id: 4, username: "amira_3o_", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop", subtitle: "Подписан(-а) _abrorov", followed: false }
  ]);

  // Active Story Modal Viewer
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  // Animation states for heart popup on double-click
  const [heartAnimPostId, setHeartAnimPostId] = useState<number | null>(null);

  // Handle post commenting
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});

  const handleLike = (postId: number) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const isLiked = !post.isLiked;
          return {
            ...post,
            isLiked,
            likes: isLiked ? post.likes + 1 : post.likes - 1
          };
        }
        return post;
      })
    );
  };

  const handleDoubleLike = (postId: number) => {
    setHeartAnimPostId(postId);
    setTimeout(() => setHeartAnimPostId(null), 1000);

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId && !post.isLiked) {
          return {
            ...post,
            isLiked: true,
            likes: post.likes + 1
          };
        }
        return post;
      })
    );
  };

  const handleSave = (postId: number) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post.id === postId ? { ...post, isSaved: !post.isSaved } : post
      )
    );
  };

  const handleAddComment = (postId: number, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...post.comments, { username: currentUser.username, text: text.trim() }]
          };
        }
        return post;
      })
    );

    setCommentInputs({ ...commentInputs, [postId]: "" });
  };

  const handleViewStory = (story: Story) => {
    // Mark story as viewed
    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, viewed: true } : s))
    );
    setActiveStory(story);
  };

  const handleFollowSuggestion = (id: number) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, followed: !s.followed } : s))
    );
  };

  return (
    <div className="flex-1 flex max-w-[935px] mx-auto w-full px-0 sm:px-4 md:py-8 justify-between gap-16">
      
      {/* Feed Area */}
      <div className="flex-1 max-w-[470px] mx-auto md:mx-0 flex flex-col gap-4">
        
        {/* Stories Section */}
        <div className="flex gap-4 p-4 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 md:rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
          {stories.map((story) => (
            <button
              key={story.id}
              onClick={() => handleViewStory(story)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer outline-none group"
            >
              <div
                className={`p-[2px] rounded-full transition-transform group-hover:scale-105 ${
                  story.viewed
                    ? "bg-zinc-200 dark:bg-zinc-800"
                    : "bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600"
                }`}
              >
                <div className="bg-white dark:bg-black p-[2px] rounded-full">
                  <img
                    src={story.avatar}
                    alt={story.username}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="text-xs text-zinc-600 dark:text-zinc-400 max-w-[68px] truncate">
                {story.username}
              </span>
            </button>
          ))}
        </div>

        {/* Posts Feed */}
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 md:rounded-xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3.5">
                <div className="flex items-center gap-3">
                  <img
                    src={post.avatar}
                    alt={post.username}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-850"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">
                      {post.username}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{post.location}</span>
                  </div>
                </div>
                <button className="text-zinc-800 dark:text-zinc-250 p-1 hover:text-zinc-500">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Media with double-tap like */}
              <div
                className="relative aspect-square w-full select-none cursor-pointer overflow-hidden bg-zinc-100 dark:bg-zinc-900"
                onDoubleClick={() => handleDoubleLike(post.id)}
              >
                <img
                  src={post.image}
                  alt="Post content"
                  className="w-full h-full object-cover hover:scale-101 transition duration-500"
                />

                {/* Big Heart Animation */}
                {heartAnimPostId === post.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl animate-ping opacity-90 stroke-[1px]" />
                  </div>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex justify-between items-center p-3.5">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="p-1 transition duration-100 hover:scale-110 active:scale-90"
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        post.isLiked
                          ? "text-red-500 fill-red-500 animate-in zoom-in-75 duration-100"
                          : "text-zinc-800 dark:text-zinc-200 hover:text-zinc-500"
                      }`}
                    />
                  </button>
                  <button className="p-1 hover:text-zinc-500 hover:scale-110 active:scale-90 transition duration-100">
                    <MessageCircle className="w-6 h-6 text-zinc-800 dark:text-zinc-200" />
                  </button>
                  <button className="p-1 hover:text-zinc-500 hover:scale-110 active:scale-90 transition duration-100">
                    <Send className="w-6 h-6 text-zinc-800 dark:text-zinc-200" />
                  </button>
                </div>
                <button
                  onClick={() => handleSave(post.id)}
                  className="p-1 hover:text-zinc-500 hover:scale-110 active:scale-90 transition duration-100"
                >
                  <Bookmark
                    className={`w-6 h-6 ${
                      post.isSaved
                        ? "text-zinc-800 dark:text-white fill-zinc-800 dark:fill-white"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  />
                </button>
              </div>

              {/* Likes & Info */}
              <div className="px-3.5 pb-2 flex flex-col gap-1.5">
                <span className="font-bold text-sm">
                  {post.likes.toLocaleString()} likes
                </span>
                
                {/* Caption */}
                <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                  <span className="font-bold mr-2 hover:underline cursor-pointer">{post.username}</span>
                  {post.caption}
                </p>

                {/* View all comments toggle */}
                {post.comments.length > 0 && (
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 hover:underline cursor-pointer">
                    View all {post.comments.length} comments
                  </span>
                )}

                {/* Comment details list */}
                <div className="flex flex-col gap-1 mt-1">
                  {post.comments.map((comment, index) => (
                    <p key={index} className="text-sm">
                      <span className="font-bold mr-2 hover:underline cursor-pointer">
                        {comment.username}
                      </span>
                      <span className="text-zinc-800 dark:text-zinc-200">{comment.text}</span>
                    </p>
                  ))}
                </div>

                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mt-2">
                  {post.time}
                </span>
              </div>

              {/* Comment Input Box */}
              <form
                onSubmit={(e) => handleAddComment(post.id, e)}
                className="border-t border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <button type="button" className="text-zinc-850 dark:text-zinc-200 p-0.5 hover:text-zinc-550">
                    <Smile className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    placeholder="Добавьте комментарий..."
                    value={commentInputs[post.id] || ""}
                    onChange={(e) =>
                      setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                    }
                    className="bg-transparent text-sm w-full outline-none placeholder-zinc-400 border-none ring-0 p-0"
                  />
                </div>
                {(commentInputs[post.id] || "").trim() && (
                  <button
                    type="submit"
                    className="text-blue-500 font-semibold text-sm hover:text-blue-600 px-1 cursor-pointer"
                  >
                    Опубликовать
                  </button>
                )}
              </form>
            </article>
          ))}
        </div>
      </div>

      {/* Suggestions Sidebar (Desktop Only) */}
      <aside className="hidden lg:flex flex-col w-[320px] pt-4 select-none">
        {/* User Card */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img
              src={currentUser.avatar}
              alt={currentUser.username}
              className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-850"
            />
            <div className="flex flex-col">
              <span className="font-bold text-sm hover:underline cursor-pointer">
                {currentUser.username}
              </span>
              <span className="text-zinc-500 dark:text-zinc-450 text-xs font-normal">{currentUser.name}</span>
            </div>
          </div>
          <button className="text-blue-500 font-bold text-xs hover:text-blue-600 cursor-pointer">
            Переключиться
          </button>
        </div>

        {/* Suggestions Title */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-zinc-500 dark:text-zinc-400 font-bold text-sm">Рекомендации для вас</span>
          <Link href="/explore/people" className="text-zinc-800 dark:text-zinc-200 font-bold text-xs hover:text-zinc-505">
            Все
          </Link>
        </div>

        {/* Suggestion list */}
        <div className="flex flex-col gap-4 mb-8">
          {suggestions.map((sug) => (
            <div key={sug.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={sug.avatar}
                  alt={sug.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex flex-col max-w-[180px]">
                  <span className="font-bold text-sm hover:underline cursor-pointer truncate">
                    {sug.username}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs truncate">
                    {sug.subtitle}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleFollowSuggestion(sug.id)}
                className={`font-bold text-xs transition duration-150 cursor-pointer ${
                  sug.followed
                    ? "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800"
                    : "text-blue-500 hover:text-blue-600"
                }`}
              >
                {sug.followed ? "Подписки" : "Подписаться"}
              </button>
            </div>
          ))}
        </div>

        {/* Footer links */}
        <footer className="text-zinc-450 dark:text-zinc-650 text-[11px] leading-snug flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
            {["Информация", "Помощь", "Пресса", "API", "Вакансии", "Конфиденциальность", "Условия", "Места", "Язык", "Meta Verified"].map((link) => (
              <React.Fragment key={link}>
                <a href="#" className="hover:underline">{link}</a>
                <span className="last:hidden select-none">•</span>
              </React.Fragment>
            ))}
          </div>
          <span>© 2026 INSTAGRAM FROM META</span>
        </footer>
      </aside>

      {/* ----------------- STORY MODAL OVERLAY ----------------- */}
      {activeStory && (
        <div className="fixed inset-0 bg-black/95 z-55 flex items-center justify-center p-4 select-none">
          {/* Close button */}
          <button
            onClick={() => setActiveStory(null)}
            className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2 z-55"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Previous Story Arrow */}
          <button
            onClick={() => {
              const currentIdx = stories.findIndex((s) => s.id === activeStory.id);
              if (currentIdx > 0) {
                handleViewStory(stories[currentIdx - 1]);
              }
            }}
            disabled={stories.findIndex((s) => s.id === activeStory.id) === 0}
            className="absolute left-4 p-2 text-white hover:text-zinc-300 disabled:opacity-20"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          {/* Story Container */}
          <div className="relative w-full max-w-md h-[80vh] rounded-xl overflow-hidden shadow-2xl flex flex-col bg-zinc-950">
            {/* Header info */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center gap-3">
              <img
                src={activeStory.avatar}
                alt={activeStory.username}
                className="w-9 h-9 rounded-full object-cover border border-white"
              />
              <span className="text-white font-semibold text-sm drop-shadow">{activeStory.username}</span>
            </div>

            {/* Main view */}
            <img
              src={activeStory.image}
              alt="Story"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Next Story Arrow */}
          <button
            onClick={() => {
              const currentIdx = stories.findIndex((s) => s.id === activeStory.id);
              if (currentIdx < stories.length - 1) {
                handleViewStory(stories[currentIdx + 1]);
              }
            }}
            disabled={stories.findIndex((s) => s.id === activeStory.id) === stories.length - 1}
            className="absolute right-4 p-2 text-white hover:text-zinc-300 disabled:opacity-20"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </div>
      )}
    </div>
  );
}
