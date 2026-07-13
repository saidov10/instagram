"use client";

import React, { useState } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreVertical,
  Music,
  Volume2,
  VolumeX,
  X,
  Smile
} from "lucide-react";
import { useApp } from "../context/AppContext";

interface ReelComment {
  id: number;
  username: string;
  avatar: string;
  text: string;
  likes: number;
  time: string;
}

interface Reel {
  id: number;
  creator: string;
  avatar: string;
  media: string;
  caption: string;
  musicName: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  comments: ReelComment[];
}

export default function ReelsPage() {
  const { currentUser } = useApp();
  const [muted, setMuted] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const [reels, setReels] = useState<Reel[]>([
    {
      id: 1,
      creator: "surfer_extreme",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      media: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&h=1000&fit=crop",
      caption: "Catching the biggest wave of the season in Hawaii! Mind-blowing swell today. #surf #hawaii #ocean #adrenaline",
      musicName: "Original Audio - surfer_extreme",
      likesCount: 45210,
      commentsCount: 512,
      isLiked: false,
      isSaved: false,
      comments: [
        { id: 1, username: "beach_bum", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop", text: "Dude, that drop was absolutely mental!", likes: 42, time: "1h" },
        { id: 2, username: "water_lilly", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop", text: "The camera angle makes it look 100ft high, so cool!", likes: 18, time: "40m" }
      ]
    },
    {
      id: 2,
      creator: "adventure_drone",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      media: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=1000&fit=crop",
      caption: "Flying above the fog during sunrise. Epic drone capture! #drone #sunrise #foggy #morning #explore",
      musicName: "Morning Chill Beats - Lofi Artist",
      likesCount: 89043,
      commentsCount: 924,
      isLiked: false,
      isSaved: false,
      comments: [
        { id: 1, username: "sky_high", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&h=80&fit=crop", text: "Which drone model did you use for this? Extremely stable flight.", likes: 88, time: "3h" },
        { id: 2, username: "fog_watcher", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop", text: "Looks like a painting. Outstanding colors!", likes: 31, time: "2h" }
      ]
    },
    {
      id: 3,
      creator: "dance_vibe",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      media: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&h=1000&fit=crop",
      caption: "Choreography for our upcoming show. Let us know what you think in the comments! #dance #choreo #hiphop #vibes",
      musicName: "Dance Remix 2026 - DJ Club",
      likesCount: 124392,
      commentsCount: 1840,
      isLiked: false,
      isSaved: false,
      comments: [
        { id: 1, username: "groove_master", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop", text: "The sync in the chorus is immaculate!", likes: 212, time: "5h" }
      ]
    }
  ]);

  const currentReel = reels[activeReelIndex];

  const handleLike = (id: number) => {
    setReels((prev) =>
      prev.map((reel) => {
        if (reel.id === id) {
          const isLiked = !reel.isLiked;
          return {
            ...reel,
            isLiked,
            likesCount: isLiked ? reel.likesCount + 1 : reel.likesCount - 1
          };
        }
        return reel;
      })
    );
  };

  const handleSave = (id: number) => {
    setReels((prev) =>
      prev.map((reel) => (reel.id === id ? { ...reel, isSaved: !reel.isSaved } : reel))
    );
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const newCommentObj: ReelComment = {
      id: Date.now(),
      username: currentUser.username,
      avatar: currentUser.avatar,
      text: newComment.trim(),
      likes: 0,
      time: "1s"
    };

    setReels((prev) =>
      prev.map((reel) => {
        if (reel.id === currentReel.id) {
          return {
            ...reel,
            commentsCount: reel.commentsCount + 1,
            comments: [newCommentObj, ...reel.comments]
          };
        }
        return reel;
      })
    );

    setNewComment("");
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    const clientHeight = e.currentTarget.clientHeight;
    const newIdx = Math.round(scrollPos / clientHeight);
    if (newIdx !== activeReelIndex && newIdx >= 0 && newIdx < reels.length) {
      setActiveReelIndex(newIdx);
    }
  };

  return (
    <div className="flex-1 flex justify-center items-center py-4 md:py-8 h-[calc(100vh-64px)] md:h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200">
      
      {/* Reels Core Layout container */}
      <div className="flex gap-6 max-h-[85vh] h-full items-center">
        
        {/* Reel Mobile Container */}
        <div className="relative aspect-[9/16] w-full max-w-[400px] h-full bg-black rounded-xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* Vertical scroll container */}
          <div
            onScroll={handleScroll}
            className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar scroll-smooth h-full"
          >
            {reels.map((reel, idx) => (
              <div
                key={reel.id}
                className="w-full h-full snap-start snap-always relative flex-shrink-0"
              >
                {/* Visual Media (Mocking tall videos with high-quality tall pictures) */}
                <img
                  src={reel.media}
                  alt={reel.creator}
                  className="w-full h-full object-cover select-none"
                />

                {/* Progress bar line */}
                {activeReelIndex === idx && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                    <div className="h-full bg-white animate-reel-progress w-full origin-left duration-[15s]" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Top overlays: Header info */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-center text-white z-10">
            <span className="font-bold text-lg">Reels</span>
            <button
              onClick={() => setMuted(!muted)}
              className="bg-black/30 backdrop-blur-md rounded-full p-2 hover:bg-black/50 transition"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Bottom/Left Overlay (Caption & details) */}
          <div className="absolute bottom-0 left-0 right-14 p-4 bg-gradient-to-t from-black/80 to-transparent text-white flex flex-col gap-2 z-10 pointer-events-auto">
            {/* User profile row */}
            <div className="flex items-center gap-2">
              <img
                src={currentReel.avatar}
                alt={currentReel.creator}
                className="w-8 h-8 rounded-full border border-white object-cover"
              />
              <span className="font-semibold text-sm hover:underline cursor-pointer">
                {currentReel.creator}
              </span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-semibold">Follow</span>
            </div>

            {/* Caption */}
            <p className="text-xs line-clamp-2 leading-relaxed opacity-90 select-text">
              {currentReel.caption}
            </p>

            {/* Music ticker */}
            <div className="flex items-center gap-2 text-xs mt-1 bg-black/25 backdrop-blur-sm rounded-full py-1 px-3 w-fit">
              <Music className="w-3.5 h-3.5" />
              <div className="overflow-hidden w-28 relative h-4">
                <span className="absolute animate-marquee whitespace-nowrap font-medium">
                  {currentReel.musicName}
                </span>
              </div>
            </div>
          </div>

          {/* Right Floating Actions Column */}
          <div className="absolute bottom-6 right-2 flex flex-col items-center gap-5 text-white z-10">
            {/* Like */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => handleLike(currentReel.id)}
                className="bg-black/40 hover:bg-black/60 active:scale-90 transition p-2.5 rounded-full backdrop-blur-md"
              >
                <Heart
                  className={`w-6 h-6 ${
                    currentReel.isLiked ? "fill-red-500 text-red-500" : "text-white"
                  }`}
                />
              </button>
              <span className="text-[10px] font-semibold drop-shadow">
                {currentReel.likesCount.toLocaleString()}
              </span>
            </div>

            {/* Comment toggler */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setShowComments(!showComments)}
                className={`hover:bg-black/60 active:scale-90 transition p-2.5 rounded-full backdrop-blur-md ${
                  showComments ? "bg-white text-black" : "bg-black/40 text-white"
                }`}
              >
                <MessageCircle className="w-6 h-6" />
              </button>
              <span className="text-[10px] font-semibold drop-shadow">
                {currentReel.commentsCount.toLocaleString()}
              </span>
            </div>

            {/* Share */}
            <button className="bg-black/40 hover:bg-black/60 active:scale-90 transition p-2.5 rounded-full backdrop-blur-md">
              <Send className="w-6 h-6" />
            </button>

            {/* Save */}
            <button
              onClick={() => handleSave(currentReel.id)}
              className="bg-black/40 hover:bg-black/60 active:scale-90 transition p-2.5 rounded-full backdrop-blur-md"
            >
              <Bookmark
                className={`w-6 h-6 ${currentReel.isSaved ? "fill-white" : ""}`}
              />
            </button>

            {/* Menu */}
            <button className="bg-black/40 hover:bg-black/60 transition p-2 rounded-full">
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Spinning Music Disc */}
            <div className="w-7 h-7 rounded-full border-2 border-white overflow-hidden animate-spin-slow shadow-lg mt-2">
              <img
                src={currentReel.avatar}
                alt="music-art"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

        </div>

        {/* ----------------- COMMENTS PANEL (DESKTOP) ----------------- */}
        {showComments && (
          <div className="hidden lg:flex flex-col w-[350px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl h-full shadow-2xl overflow-hidden animate-in slide-in-from-left duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-sm">Комментарии</span>
              <button
                onClick={() => setShowComments(false)}
                className="p-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {currentReel.comments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                  <span className="text-sm font-medium">Комментариев пока нет.</span>
                  <span className="text-xs">Начните общение.</span>
                </div>
              ) : (
                currentReel.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <img
                      src={comment.avatar}
                      alt={comment.username}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 flex flex-col gap-0.5">
                      <p className="text-xs">
                        <span className="font-bold mr-2 hover:underline cursor-pointer">
                          {comment.username}
                        </span>
                        <span className="text-zinc-800 dark:text-zinc-250 leading-snug">
                          {comment.text}
                        </span>
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 select-none">
                        <span>{comment.time}</span>
                        {comment.likes > 0 && <span>Отметок &quot;Нравится&quot;: {comment.likes}</span>}
                        <button className="hover:text-zinc-700 dark:hover:text-zinc-300 font-semibold cursor-pointer">Ответить</button>
                      </div>
                    </div>
                    <button className="p-0.5 text-zinc-400 hover:text-red-500 transition self-start cursor-pointer">
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form
              onSubmit={handleAddComment}
              className="border-t border-zinc-200 dark:border-zinc-800 p-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                <button type="button" className="text-zinc-750 dark:text-zinc-255 hover:text-zinc-500 cursor-pointer">
                  <Smile className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Добавьте комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-transparent text-sm w-full outline-none placeholder-zinc-400 border-none ring-0 p-0"
                />
              </div>
              {newComment.trim() && (
                <button
                  type="submit"
                  className="text-blue-500 font-semibold text-sm hover:text-blue-600 px-1 cursor-pointer"
                >
                  Опубликовать
                </button>
              )}
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
