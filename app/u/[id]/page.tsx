"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Grid, Heart, MessageCircle, Lock, X } from "lucide-react";
import { RootState } from "../../store/store";
import { api, getFullImageUrl } from "../../services/api";
import { ProfileSkeleton } from "../../components/SkeletonLoader";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop";

interface PublicProfile {
  id: string;
  userName: string;
  fullName: string;
  avatar: string;
  about: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

interface GridPost {
  id: number;
  image: string;
  likes: number;
  comments: number;
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params?.id;
  const { currentUser } = useSelector((state: RootState) => state.auth);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<GridPost[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPost, setSelectedPost] = useState<GridPost | null>(null);

  // If viewing your own profile, send to the editable /profile page
  useEffect(() => {
    if (currentUser && userId && currentUser.id === userId) {
      router.replace("/profile");
    }
  }, [currentUser, userId, router]);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const p = await api.profile.getUserProfileById(userId);
      if (!p) {
        setNotFound(true);
        return;
      }
      setProfile({
        id: p.id || userId,
        userName: p.userName || p.username || "user",
        fullName: p.fullName || p.name || "",
        avatar: getFullImageUrl(p.avatar || p.imagePath) || DEFAULT_AVATAR,
        about: p.about || "",
        postsCount: p.postsCount ?? 0,
        followersCount: p.followersCount ?? 0,
        followingCount: p.followingCount ?? 0,
      });

      const myId = currentUser?.id;
      const [rawPosts, mySubs] = await Promise.all([
        api.post.getPosts({ userId }).catch(() => []),
        // The is-follow endpoint is unreliable server-side; derive from our own
        // subscriptions list, which is authoritative.
        myId ? api.following.getSubscriptions(myId).catch(() => []) : Promise.resolve([]),
      ]);

      setPosts(
        (rawPosts || []).map((rp: any) => ({
          id: rp.id || rp.postId,
          image: getFullImageUrl((rp.images && rp.images[0]) || rp.filePath || rp.imagePath || rp.image) || DEFAULT_AVATAR,
          likes: typeof rp.likeCount === "number" ? rp.likeCount : (rp.likes?.length || 0),
          comments: rp.commentCount || 0,
        }))
      );
      setIsFollowing((mySubs || []).some((s: any) => (s.id || s.userId) === userId));
    } catch (err) {
      console.error(err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!userId || followBusy) return;
    setFollowBusy(true);
    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setProfile((prev) =>
      prev ? { ...prev, followersCount: prev.followersCount + (wasFollowing ? -1 : 1) } : prev
    );
    try {
      if (wasFollowing) {
        await api.following.unfollow(userId);
      } else {
        await api.following.follow(userId);
      }
    } catch (err) {
      console.error(err);
      // Revert on failure
      setIsFollowing(wasFollowing);
      setProfile((prev) =>
        prev ? { ...prev, followersCount: prev.followersCount + (wasFollowing ? 1 : -1) } : prev
      );
    } finally {
      setFollowBusy(false);
    }
  };

  const handleMessage = async () => {
    if (!userId) return;
    try {
      await api.chat.createChat(userId);
    } catch (err) {
      console.error(err);
    }
    router.push("/direct/inbox");
  };

  if (loading) return <ProfileSkeleton />;

  if (notFound || !profile) {
    return (
      <div className="w-full max-w-[935px] mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center bg-white dark:bg-black text-black dark:text-white">
        <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold">Пользователь недоступен</h2>
        <p className="text-sm text-zinc-500 max-w-xs">Ссылка, возможно, недействительна или профиль был удалён.</p>
        <button onClick={() => router.push("/")} className="text-blue-500 font-bold text-sm hover:text-blue-400 cursor-pointer">
          Вернуться на главную
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[935px] mx-auto px-4 py-8 flex flex-col gap-10 text-black dark:text-white transition-colors duration-200 animate-fade-up">

      {/* ----------------- HEADER ----------------- */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-24 border-b border-zinc-200 dark:border-zinc-800 pb-10">
        <div className="relative w-36 h-36 flex-shrink-0">
          <div className="w-full h-full rounded-full p-[3px] gradient-ring animate-gradient shadow-soft-md">
            <div className="bg-background p-1 rounded-full w-full h-full">
              <img
                src={profile.avatar}
                alt={profile.userName}
                className="w-full h-full rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-5 w-full text-left">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-normal">{profile.userName}</h2>
            <div className="flex gap-2 text-sm font-semibold">
              <button
                onClick={handleFollow}
                disabled={followBusy}
                className={`px-6 py-2 rounded-xl transition cursor-pointer disabled:opacity-60 press ${
                  isFollowing
                    ? "glass hover:shadow-soft text-black dark:text-white"
                    : "btn-grad"
                }`}
              >
                {isFollowing ? "Вы подписаны" : "Подписаться"}
              </button>
              <button
                onClick={handleMessage}
                className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-1.5 rounded-lg transition cursor-pointer"
              >
                Написать
              </button>
            </div>
          </div>

          <div className="flex gap-8 text-sm md:text-base">
            <span><strong className="font-semibold">{profile.postsCount}</strong> публикаций</span>
            <span><strong className="font-semibold">{profile.followersCount}</strong> подписчиков</span>
            <span><strong className="font-semibold">{profile.followingCount}</strong> подписок</span>
          </div>

          <div className="text-sm text-zinc-900 dark:text-zinc-200">
            {profile.fullName && <span className="font-semibold block">{profile.fullName}</span>}
            <p className="mt-1 text-zinc-650 dark:text-zinc-400 whitespace-pre-wrap">
              {profile.about || "Описание отсутствует."}
            </p>
          </div>
        </div>
      </header>

      {/* ----------------- POSTS GRID ----------------- */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-center border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 py-4 border-t-2 border-black dark:border-white text-black dark:text-white">
            <Grid className="w-4 h-4" />
            <span className="text-[12px] font-bold uppercase tracking-wider">Публикации</span>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
              <Grid className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">Публикаций пока нет</h3>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-7">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="relative aspect-square cursor-pointer group bg-zinc-100 dark:bg-zinc-950 overflow-hidden rounded-xl md:rounded-2xl lift shadow-soft"
              >
                {post.image.toLowerCase().match(/\.(mp4|mov|webm)$/) ? (
                  <video src={post.image} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <img src={post.image} alt="Post" className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-6 text-white text-base font-bold">
                  <div className="flex items-center gap-2"><Heart className="w-6 h-6 fill-white" />{post.likes}</div>
                  <div className="flex items-center gap-2"><MessageCircle className="w-6 h-6 fill-white" />{post.comments}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----------------- POST PREVIEW MODAL ----------------- */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPost(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2 z-55">
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-3xl max-h-[85vh] w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {selectedPost.image.toLowerCase().match(/\.(mp4|mov|webm)$/) ? (
              <video src={selectedPost.image} className="max-h-[85vh] w-auto rounded-xl" controls autoPlay loop />
            ) : (
              <img src={selectedPost.image} alt="Post" className="max-h-[85vh] w-auto object-contain rounded-xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
