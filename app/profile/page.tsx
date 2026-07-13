"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Grid,
  Film,
  Bookmark,
  Heart,
  MessageCircle,
  Settings,
  Plus,
  X,
  Smile
} from "lucide-react";
import { AppDispatch, RootState } from "../store/store";
import { fetchMyProfile } from "../store/slices/authSlice";
import { fetchMyPosts, toggleLikePost, addComment, addPostFavorite } from "../store/slices/postsSlice";
import { api } from "../services/api";
import { ProfileSkeleton } from "../components/SkeletonLoader";
import { useApp } from "../context/AppContext";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { setCreateOpen } = useApp();
  const { currentUser, profileLoading, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const { myPosts } = useSelector((state: RootState) => state.posts);
  
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "saved" | "tagged">("posts");
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");

  // Modal lists
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [showFollowingList, setShowFollowingList] = useState(false);
  
  // Follow list dynamic states
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      dispatch(fetchMyPosts());
      
      // Fetch followers & following
      const loadRelations = async () => {
        try {
          const subscribers = await api.following.getSubscribers(currentUser.id);
          setFollowers(subscribers.map((s: any) => ({
            id: s.id || s.userId,
            username: s.userName || s.username || "follower",
            name: s.name || s.fullName || "User",
            avatar: s.avatar || s.imagePath || "",
            following: true
          })));

          const subscriptions = await api.following.getSubscriptions(currentUser.id);
          setFollowing(subscriptions.map((s: any) => ({
            id: s.id || s.userId,
            username: s.userName || s.username || "following",
            name: s.name || s.fullName || "User",
            avatar: s.avatar || s.imagePath || "",
            following: true
          })));
        } catch (err) {
          console.error("Failed to load followers/following:", err);
        }
      };
      loadRelations();
    }
  }, [isLoggedIn, currentUser, dispatch]);

  const selectedPost = myPosts.find((p) => p.id === selectedPostId);

  const handleLikePostDetail = (id: number) => {
    dispatch(toggleLikePost(id));
  };

  const handleAddCommentDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newComment.trim() || !currentUser) return;

    dispatch(addComment({
      postId: selectedPost.id,
      comment: newComment.trim(),
      username: currentUser.username
    }));
    setNewComment("");
  };

  const handleFollowToggle = async (userId: string, isFollowing: boolean, username: string) => {
    try {
      if (isFollowing) {
        await api.following.unfollow(username);
      } else {
        await api.following.follow(username);
      }
      // Refresh relations
      if (currentUser) {
        const subscriptions = await api.following.getSubscriptions(currentUser.id);
        setFollowing(subscriptions.map((s: any) => ({
          id: s.id || s.userId,
          username: s.userName || s.username || "following",
          name: s.name || s.fullName || "User",
          avatar: s.avatar || s.imagePath || "",
          following: true
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (profileLoading || !currentUser) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="w-full max-w-[935px] mx-auto px-4 py-8 flex flex-col gap-10 bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      
      {/* ----------------- PROFILE HEADER ----------------- */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-24 border-b border-zinc-200 dark:border-zinc-800 pb-10">
        {/* Profile Picture */}
        <div className="relative w-36 h-36 flex-shrink-0 cursor-pointer group">
          <div className="w-full h-full rounded-full p-[3px] bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600">
            <div className="bg-white dark:bg-black p-1 rounded-full w-full h-full">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-full h-full rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>
        </div>

        {/* User Info Column */}
        <div className="flex-1 flex flex-col gap-5 w-full text-left">
          {/* Row 1: Username & Settings */}
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-xl font-normal flex items-center gap-1.5">
              {currentUser.username}
            </h2>
            <div className="flex gap-2 text-sm font-semibold select-none">
              <button
                onClick={() => router.push("/settings")}
                className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:opacity-80 px-4 py-1.5 rounded-lg transition cursor-pointer"
              >
                Редактировать профиль
              </button>
            </div>
            <button
              onClick={() => router.push("/settings")}
              className="p-1 hover:text-zinc-500 cursor-pointer"
            >
              <Settings className="w-6 h-6 stroke-[1.5px]" />
            </button>
          </div>

          {/* Row 2: Metrics */}
          <div className="flex gap-8 text-sm md:text-base select-none">
            <span>
              <strong className="font-semibold">{myPosts.length}</strong> публикаций
            </span>
            <button onClick={() => setShowFollowersList(true)} className="hover:opacity-75 transition cursor-pointer">
              <strong className="font-semibold">{followers.length}</strong> подписчиков
            </button>
            <button onClick={() => setShowFollowingList(true)} className="hover:opacity-75 transition cursor-pointer">
              <strong className="font-semibold">{following.length}</strong> подписок
            </button>
          </div>

          {/* Row 3: Bio */}
          <div className="text-sm font-normal text-zinc-900 dark:text-zinc-200">
            <span className="font-semibold block">{currentUser.name}</span>
            <p className="mt-1 text-zinc-650 dark:text-zinc-400 whitespace-pre-wrap">{currentUser.about || "Описание отсутствует."}</p>
          </div>
        </div>
      </header>

      {/* ----------------- TABS SECTION ----------------- */}
      <div className="flex flex-col gap-6">
        {/* Tab Headers */}
        <div className="flex justify-center border-t border-zinc-200 dark:border-zinc-800 pt-0 gap-16 text-zinc-400 select-none">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
              activeTab === "posts"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Grid className="w-4 h-4" />
            <span className="text-[12px] font-bold uppercase tracking-wider hidden md:inline">Публикации</span>
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
              activeTab === "saved"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span className="text-[12px] font-bold uppercase tracking-wider hidden md:inline">Сохранено</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "posts" && (
          <div>
            {myPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center select-none gap-6">
                <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
                  <Grid className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Поделитесь фото</h3>
                <p className="text-sm text-zinc-400 max-w-xs">Ваши публикации будут отображаться здесь.</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="text-blue-500 font-bold text-sm hover:text-blue-400 cursor-pointer"
                >
                  Поделитесь первым фото
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-7">
                {myPosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPostId(post.id)}
                    className="relative aspect-square cursor-pointer group bg-zinc-100 dark:bg-zinc-950 overflow-hidden"
                  >
                    <img src={post.image} alt="Grid thumbnail" className="w-full h-full object-cover transition duration-300 group-hover:scale-103" />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-6 text-white text-base font-bold">
                      <div className="flex items-center gap-2">
                        <Heart className="w-6 h-6 fill-white" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 fill-white" />
                        <span>{post.comments.length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="text-center py-20 text-zinc-400 select-none">
            Сохраненные публикации скрыты.
          </div>
        )}
      </div>

      {/* ----------------- FOLLOWERS MODAL ----------------- */}
      {showFollowersList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="w-6" />
              <h3 className="font-bold text-base">Подписчики</h3>
              <button onClick={() => setShowFollowersList(false)} className="hover:opacity-70">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 flex flex-col gap-4.5">
              {followers.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Нет подписчиков.</p>
              ) : (
                followers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar || DEFAULT_AVATAR} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800" />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm leading-none">{user.username}</span>
                        <span className="text-xs text-zinc-400 leading-none mt-1">{user.name}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- FOLLOWING MODAL ----------------- */}
      {showFollowingList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="w-6" />
              <h3 className="font-bold text-base">Подписки</h3>
              <button onClick={() => setShowFollowingList(false)} className="hover:opacity-70">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 flex flex-col gap-4.5">
              {following.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Нет подписок.</p>
              ) : (
                following.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar || DEFAULT_AVATAR} alt={user.username} className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-800" />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm leading-none">{user.username}</span>
                        <span className="text-xs text-zinc-400 leading-none mt-1">{user.name}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleFollowToggle(user.id, user.following, user.username)}
                      className={`text-xs font-bold px-4 py-1.5 rounded-lg border transition ${
                        user.following
                          ? "bg-transparent text-zinc-500 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          : "bg-blue-500 text-white border-transparent hover:bg-blue-600"
                      }`}
                    >
                      {user.following ? "Подписки" : "Подписаться"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- POST DETAILS DIALOG ----------------- */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row w-full max-w-4xl max-h-[85vh] relative animate-in zoom-in-95 duration-150">
            {/* Close button outside details */}
            <button
              onClick={() => setSelectedPostId(null)}
              className="absolute top-4 right-4 text-white md:text-zinc-500 hover:text-zinc-300 p-2 z-55"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Column: Image */}
            <div className="flex-1 bg-zinc-950 flex items-center justify-center max-h-[45vh] md:max-h-full">
              <img src={selectedPost.image} alt="Detail" className="w-full h-full object-contain aspect-square" />
            </div>

            {/* Right Column: Feed and interactions */}
            <div className="w-full md:w-[380px] flex flex-col border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 h-[40vh] md:h-auto">
              {/* Header profile */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <img src={selectedPost.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-zinc-200" />
                <span className="font-bold text-sm">{selectedPost.username}</span>
              </div>

              {/* Comments Scroller */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-left">
                {/* Caption as first comment */}
                <div className="flex items-start gap-3 text-sm">
                  <img src={selectedPost.avatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                  <p className="leading-snug">
                    <span className="font-bold mr-2 hover:underline cursor-pointer">{selectedPost.username}</span>
                    {selectedPost.caption}
                  </p>
                </div>

                <hr className="border-zinc-150 dark:border-zinc-800" />

                {/* Other Comments */}
                {selectedPost.comments.map((comment: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs uppercase border border-zinc-200">
                      {comment.username.charAt(0)}
                    </div>
                    <p className="leading-snug">
                      <span className="font-bold mr-2 hover:underline cursor-pointer">{comment.username}</span>
                      {comment.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <button onClick={() => handleLikePostDetail(selectedPost.id)} className="hover:scale-105 active:scale-95 transition">
                      <Heart className={`w-6 h-6 ${selectedPost.isLiked ? "text-red-500 fill-red-500" : "text-black dark:text-white"}`} />
                    </button>
                  </div>
                </div>
                <span className="font-bold text-sm text-left">{selectedPost.likes} likes</span>
              </div>

              {/* Form Input */}
              <form onSubmit={handleAddCommentDetail} className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Добавить комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-transparent text-sm w-full outline-none placeholder-zinc-400 border-none ring-0 p-0 text-black dark:text-white"
                />
                {newComment.trim() && (
                  <button type="submit" className="text-blue-500 font-semibold text-sm hover:text-blue-400 cursor-pointer">
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
