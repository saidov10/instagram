"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
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
import { AppDispatch, RootState } from "../store/store";
import { fetchReels, toggleLikePost, addComment, addPostFavorite } from "../store/slices/postsSlice";
import { useApp } from "../context/AppContext";
import { getFullImageUrl } from "../services/api";

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

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";

export default function ReelsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const { reels: backendReels, loading } = useSelector((state: RootState) => state.posts);
  
  const [muted, setMuted] = useState(false);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const [reels, setReels] = useState<Reel[]>([]);

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchReels({}));
    }
  }, [isLoggedIn, dispatch]);

  useEffect(() => {
    if (backendReels && backendReels.length > 0) {
      const formatted: Reel[] = backendReels.map((p: any) => ({
        id: p.id || p.postId,
        creator: p.userName || p.username || "creator",
        avatar: getFullImageUrl(p.userAvatar || p.userImage) || DEFAULT_AVATAR,
        media: getFullImageUrl(p.filePath || p.imagePath || (p.images && p.images[0]) || p.image) || "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&h=1000&fit=crop",
        caption: p.content || p.title || "",
        musicName: `Original Audio - ${p.userName || "creator"}`,
        likesCount: p.likeCount || p.likes || 0,
        commentsCount: p.comments?.length || 0,
        isLiked: p.isLikedByCurrentUser || p.isLiked || false,
        isSaved: p.isSavedByCurrentUser || p.isSaved || false,
        comments: (p.comments || []).map((c: any) => ({
          id: c.id || c.commentId,
          username: c.userName || c.username || "commenter",
          avatar: getFullImageUrl(c.userAvatar) || DEFAULT_AVATAR,
          text: c.comment || c.text || "",
          likes: 0,
          time: "Just now",
        })),
      }));
      setReels(formatted);
    } else {
      // Fallback mocks if backend reels list is empty
      setReels([
        {
          id: 101,
          creator: "saidov.7",
          avatar: DEFAULT_AVATAR,
          media: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&h=1000&fit=crop",
          caption: "Epic views! #explore #surf #nature",
          musicName: "Original Audio - saidov.7",
          likesCount: 1530,
          commentsCount: 2,
          isLiked: false,
          isSaved: false,
          comments: [
            { id: 1, username: "surfer_joe", avatar: DEFAULT_AVATAR, text: "Awesome capture!", likes: 10, time: "1h" }
          ]
        }
      ]);
    }
  }, [backendReels]);

  const currentReel = reels[activeReelIndex];

  const handleLike = (id: number) => {
    dispatch(toggleLikePost(id));
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const liked = !r.isLiked;
          return {
            ...r,
            isLiked: liked,
            likesCount: liked ? r.likesCount + 1 : r.likesCount - 1
          };
        }
        return r;
      })
    );
  };

  const handleSave = (id: number) => {
    dispatch(addPostFavorite(id));
    setReels((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isSaved: !r.isSaved } : r))
    );
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || !currentReel) return;

    dispatch(addComment({
      postId: currentReel.id,
      comment: newComment.trim(),
      username: currentUser.username
    }));

    const newCommentObj: ReelComment = {
      id: Date.now(),
      username: currentUser.username,
      avatar: currentUser.avatar,
      text: newComment.trim(),
      likes: 0,
      time: "1s"
    };

    setReels((prev) =>
      prev.map((r) => {
        if (r.id === currentReel.id) {
          return {
            ...r,
            commentsCount: r.commentsCount + 1,
            comments: [newCommentObj, ...r.comments]
          };
        }
        return r;
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

  if (!currentReel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-white">
        <div className="w-8 h-8 border-4 border-t-transparent border-white rounded-full animate-spin" />
      </div>
    );
  }

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
                {reel.media.toLowerCase().endsWith('.mp4') || reel.media.toLowerCase().endsWith('.mov') || reel.media.toLowerCase().endsWith('.webm') ? (
                  <video
                    src={reel.media}
                    className="w-full h-full object-cover select-none"
                    muted={muted}
                    loop
                    autoPlay={activeReelIndex === idx}
                    playsInline
                  />
                ) : (
                  <img
                    src={reel.media}
                    alt={reel.creator}
                    className="w-full h-full object-cover select-none"
                  />
                )}

                {/* Progress bar line */}
                {activeReelIndex === idx && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                    <div className="h-full bg-white animate-reel-progress w-full origin-left" style={{ animationDuration: '15s' }} />
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
            </div>

            {/* Caption */}
            <p className="text-xs line-clamp-2 leading-relaxed opacity-90 select-text text-left">
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
              <span className="text-xs font-semibold drop-shadow">{currentReel.likesCount.toLocaleString()}</span>
            </div>

            {/* Comments toggle */}
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setShowComments(true)}
                className="bg-black/40 hover:bg-black/60 active:scale-90 transition p-2.5 rounded-full backdrop-blur-md"
              >
                <MessageCircle className="w-6 h-6 text-white" />
              </button>
              <span className="text-xs font-semibold drop-shadow">{currentReel.commentsCount}</span>
            </div>

            {/* Share */}
            <button className="bg-black/40 hover:bg-black/60 active:scale-90 transition p-2.5 rounded-full backdrop-blur-md">
              <Send className="w-6 h-6 text-white" />
            </button>

            {/* Save */}
            <button
              onClick={() => handleSave(currentReel.id)}
              className="bg-black/40 hover:bg-black/60 active:scale-90 transition p-2.5 rounded-full backdrop-blur-md"
            >
              <Bookmark className={`w-6 h-6 ${currentReel.isSaved ? "fill-white text-white" : "text-white"}`} />
            </button>

            {/* Menu */}
            <button className="bg-black/40 hover:bg-black/60 active:scale-90 transition p-2.5 rounded-full backdrop-blur-md">
              <MoreVertical className="w-6 h-6 text-white" />
            </button>
          </div>

        </div>

      </div>

      {/* ----------------- COMMENTS BOTTOM/RIGHT PANEL ----------------- */}
      {showComments && (
        <div className="fixed inset-0 md:relative md:inset-auto bg-black/60 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none flex md:block items-end justify-center z-50 h-full md:h-auto select-none pointer-events-auto">
          {/* Modal layout for mobile, simple card for desktop */}
          <div className="bg-white dark:bg-zinc-900 w-full md:w-[350px] h-[70vh] md:h-[85vh] rounded-t-2xl md:rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-150 dark:border-zinc-800">
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">Комментарии</h3>
              <button
                onClick={() => setShowComments(false)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full cursor-pointer text-zinc-900 dark:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-left">
              {currentReel.comments.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-450 dark:text-zinc-500 text-sm">
                  Нет комментариев. Будьте первыми!
                </div>
              ) : (
                currentReel.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start justify-between text-sm">
                    <div className="flex items-start gap-3">
                      <img
                        src={comment.avatar}
                        alt={comment.username}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-200"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900 dark:text-white">{comment.username}</span>
                        <p className="text-zinc-800 dark:text-zinc-200 leading-snug mt-0.5">{comment.text}</p>
                        <div className="flex gap-3 text-[11px] text-zinc-400 mt-1">
                          <span>{comment.time}</span>
                          <button className="font-bold cursor-pointer">Reply</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Form Box */}
            <form
              onSubmit={handleAddComment}
              className="border-t border-zinc-150 dark:border-zinc-800 p-4 flex items-center gap-3 bg-white dark:bg-zinc-900"
            >
              <button type="button" className="text-zinc-800 dark:text-white hover:text-zinc-500">
                <Smile className="w-5 h-5" />
              </button>
              <input
                type="text"
                placeholder="Добавить комментарий..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-transparent text-sm w-full outline-none placeholder-zinc-450 text-zinc-900 dark:text-white"
              />
              {newComment.trim() && (
                <button
                  type="submit"
                  className="text-blue-500 font-semibold text-sm hover:text-blue-650 cursor-pointer"
                >
                  Опубликовать
                </button>
              )}
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
