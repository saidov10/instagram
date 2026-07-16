"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Grid, Heart, MessageCircle, Lock, X, MoreHorizontal, EyeOff, Eye, Ban, Flag, UserX, VolumeX, ChevronLeft } from "lucide-react";
import { RootState } from "../../store/store";
import { api, getFullImageUrl, ApiError } from "../../services/api";
import { ProfileSkeleton } from "../../components/SkeletonLoader";
import Avatar from "../../components/Avatar";
import SmartImage from "../../components/SmartImage";
import Highlights from "../../components/Highlights";
import ReportModal, { ReportTarget } from "../../components/ReportModal";

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
  isPrivate: boolean;
}

type FollowState = "none" | "following" | "pending";

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
  const [followState, setFollowState] = useState<FollowState>("none");
  const [followBusy, setFollowBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [selectedPost, setSelectedPost] = useState<GridPost | null>(null);

  // Options menu (block / hide stories / report / restrict / mute)
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isHidingStoriesFrom, setIsHidingStoriesFrom] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [muteType, setMuteType] = useState<"NONE" | "ALL" | "POSTS" | "STORIES">("NONE");
  const [showMuteSubmenu, setShowMuteSubmenu] = useState(false);
  const [optionsBusy, setOptionsBusy] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

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
    setForbidden(false);
    try {
      const [p, blockedList] = await Promise.all([
        api.profile.getUserProfileById(userId),
        api.user.getBlockedUsers().catch(() => []),
      ]);
      if (!p) {
        setNotFound(true);
        return;
      }
      setIsBlocked((blockedList || []).some((b: any) => (b.id || b.userId) === userId));

      const isPrivate = !!p.isPrivate;
      setProfile({
        id: p.id || userId,
        userName: p.userName || p.username || "user",
        fullName: p.fullName || p.name || "",
        avatar: getFullImageUrl(p.avatar || p.imagePath),
        about: p.about || "",
        postsCount: p.postsCount ?? 0,
        followersCount: p.followersCount ?? 0,
        followingCount: p.followingCount ?? 0,
        isPrivate,
      });

      const followStatus = await api.profile.getIsFollowUserProfileById(userId).catch(() => false);
      setFollowState(followStatus ? "following" : "none");

      // Gate the posts grid for private accounts you don't yet follow.
      if (isPrivate && !followStatus) {
        setPosts([]);
      } else {
        const rawPosts = await api.post.getPosts({ userId }).catch(() => []);
        setPosts(
          (rawPosts || []).map((rp: any) => ({
            id: rp.id || rp.postId,
            image: getFullImageUrl((rp.images && rp.images[0]) || rp.filePath || rp.imagePath || rp.image) || DEFAULT_AVATAR,
            likes: typeof rp.likeCount === "number" ? rp.likeCount : (rp.likes?.length || 0),
            comments: rp.commentCount || 0,
          }))
        );
      }
    } catch (err) {
      console.error(err);
      if (err instanceof ApiError && err.status === 403) {
        setForbidden(true);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.id]);

  // Load hide-stories-from status separately (not fatal if it fails).
  useEffect(() => {
    if (!userId) return;
    api.story.getHiddenUsers()
      .then((list) => setIsHidingStoriesFrom((list || []).some((u: any) => (u.id || u.userId) === userId)))
      .catch(() => {});
  }, [userId]);

  // Load restrict / mute status separately (not fatal if it fails).
  useEffect(() => {
    if (!userId) return;
    api.user.getRestrictedUsers()
      .then((list) => setIsRestricted((list || []).some((u: any) => (u.id || u.userId) === userId)))
      .catch(() => {});
    api.user.getMutedUsers()
      .then((list) => {
        const entry = (list || []).find((u: any) => (u.id || u.userId) === userId);
        setMuteType(entry ? (entry.muteType || "ALL") : "NONE");
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!userId || followBusy) return;
    setFollowBusy(true);
    const prevState = followState;
    try {
      if (prevState === "following" || prevState === "pending") {
        setFollowState("none");
        if (prevState === "following") {
          setProfile((prev) => (prev ? { ...prev, followersCount: prev.followersCount - 1 } : prev));
        }
        await api.following.unfollow(userId);
      } else {
        const res = await api.following.follow(userId);
        const status = typeof res === "string" ? res : res?.status;
        const pending = profile?.isPrivate && String(status || "").toUpperCase() !== "FOLLOWING";
        setFollowState(pending ? "pending" : "following");
        if (!pending) {
          setProfile((prev) => (prev ? { ...prev, followersCount: prev.followersCount + 1 } : prev));
        }
      }
    } catch (err) {
      console.error(err);
      setFollowState(prevState);
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

  const handleToggleBlock = async () => {
    if (!userId || optionsBusy) return;
    setOptionsBusy(true);
    try {
      if (isBlocked) {
        await api.user.unblockUser(userId);
        setIsBlocked(false);
      } else {
        await api.user.blockUser(userId);
        setIsBlocked(true);
      }
    } catch (err) {
      console.error("Failed to toggle block:", err);
    } finally {
      setOptionsBusy(false);
      setShowOptionsMenu(false);
    }
  };

  const handleToggleHideStories = async () => {
    if (!userId || optionsBusy) return;
    setOptionsBusy(true);
    try {
      if (isHidingStoriesFrom) {
        await api.story.unhideStoryFrom(userId);
        setIsHidingStoriesFrom(false);
      } else {
        await api.story.hideStoryFrom(userId);
        setIsHidingStoriesFrom(true);
      }
    } catch (err) {
      console.error("Failed to toggle hide stories:", err);
    } finally {
      setOptionsBusy(false);
      setShowOptionsMenu(false);
    }
  };

  const handleToggleRestrict = async () => {
    if (!userId || optionsBusy) return;
    setOptionsBusy(true);
    try {
      if (isRestricted) {
        await api.user.unrestrictUser(userId);
        setIsRestricted(false);
      } else {
        await api.user.restrictUser(userId);
        setIsRestricted(true);
      }
    } catch (err) {
      console.error("Failed to toggle restrict:", err);
    } finally {
      setOptionsBusy(false);
      setShowOptionsMenu(false);
    }
  };

  // Toggling a mute dimension: choosing the currently-active one lifts it, and
  // when neither posts nor stories remain muted we call unmute.
  const handleToggleMute = async (dimension: "POSTS" | "STORIES") => {
    if (!userId || optionsBusy) return;
    const posts = muteType === "ALL" || muteType === "POSTS";
    const stories = muteType === "ALL" || muteType === "STORIES";
    const next = {
      POSTS: !posts,
      STORIES: !stories,
    };
    if (dimension === "POSTS") next.POSTS = !posts;
    if (dimension === "STORIES") next.STORIES = !stories;

    let target: "NONE" | "ALL" | "POSTS" | "STORIES";
    if (next.POSTS && next.STORIES) target = "ALL";
    else if (next.POSTS) target = "POSTS";
    else if (next.STORIES) target = "STORIES";
    else target = "NONE";

    setOptionsBusy(true);
    const prev = muteType;
    setMuteType(target);
    try {
      if (target === "NONE") {
        await api.user.unmuteUser(userId);
      } else {
        await api.user.muteUser(userId, target);
      }
    } catch (err) {
      console.error("Failed to update mute:", err);
      setMuteType(prev);
    } finally {
      setOptionsBusy(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  if (forbidden) {
    return (
      <div className="w-full max-w-[935px] mx-auto px-4 py-20 flex flex-col items-center gap-4 text-center bg-white dark:bg-black text-black dark:text-white">
        <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
          <Ban className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold">Профиль недоступен</h2>
        <button onClick={() => router.push("/")} className="text-blue-500 font-bold text-sm hover:text-blue-400 cursor-pointer">
          Вернуться на главную
        </button>
      </div>
    );
  }

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
              <Avatar src={profile.avatar} name={profile.userName} className="w-full h-full border border-zinc-200 dark:border-zinc-800" />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-5 w-full text-left">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-normal">{profile.userName}</h2>
            <div className="flex gap-2 text-sm font-semibold items-center">
              <button
                onClick={handleFollow}
                disabled={followBusy}
                className={`px-6 py-2 rounded-xl transition cursor-pointer disabled:opacity-60 press ${
                  followState !== "none"
                    ? "glass hover:shadow-soft text-black dark:text-white"
                    : "btn-grad"
                }`}
              >
                {followState === "following" ? "Вы подписаны" : followState === "pending" ? "Запрошено" : "Подписаться"}
              </button>
              <button
                onClick={handleMessage}
                className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-1.5 rounded-lg transition cursor-pointer"
              >
                Написать
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowOptionsMenu((v) => !v)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition cursor-pointer"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {showOptionsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 glass-strong rounded-2xl shadow-soft-lg overflow-hidden z-20 animate-pop-in">
                    {showMuteSubmenu ? (
                      <>
                        <button
                          onClick={() => setShowMuteSubmenu(false)}
                          className="w-full flex items-center gap-2 p-3.5 text-sm font-bold hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer text-left"
                        >
                          <ChevronLeft className="w-4.5 h-4.5" />
                          Скрыть
                        </button>
                        <hr className="border-[var(--border)]" />
                        <button
                          onClick={() => handleToggleMute("POSTS")}
                          disabled={optionsBusy}
                          className="w-full flex items-center justify-between p-3.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer text-left"
                        >
                          <span>Публикации</span>
                          <span className={`w-9 h-5 rounded-full flex items-center transition ${muteType === "ALL" || muteType === "POSTS" ? "bg-blue-500 justify-end" : "bg-zinc-300 dark:bg-zinc-700 justify-start"} p-0.5`}>
                            <span className="w-4 h-4 rounded-full bg-white" />
                          </span>
                        </button>
                        <button
                          onClick={() => handleToggleMute("STORIES")}
                          disabled={optionsBusy}
                          className="w-full flex items-center justify-between p-3.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer text-left"
                        >
                          <span>Истории</span>
                          <span className={`w-9 h-5 rounded-full flex items-center transition ${muteType === "ALL" || muteType === "STORIES" ? "bg-blue-500 justify-end" : "bg-zinc-300 dark:bg-zinc-700 justify-start"} p-0.5`}>
                            <span className="w-4 h-4 rounded-full bg-white" />
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleToggleHideStories}
                          disabled={optionsBusy}
                          className="w-full flex items-center gap-3 p-3.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer text-left"
                        >
                          {isHidingStoriesFrom ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
                          {isHidingStoriesFrom ? "Показать мои истории" : "Скрыть мои истории от этого пользователя"}
                        </button>
                        <hr className="border-[var(--border)]" />
                        <button
                          onClick={() => setShowMuteSubmenu(true)}
                          className="w-full flex items-center gap-3 p-3.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer text-left"
                        >
                          <VolumeX className="w-4.5 h-4.5" />
                          Скрыть
                          {muteType !== "NONE" && (
                            <span className="ml-auto text-xs text-zinc-400">
                              {muteType === "ALL" ? "Всё" : muteType === "POSTS" ? "Публикации" : "Истории"}
                            </span>
                          )}
                        </button>
                        <hr className="border-[var(--border)]" />
                        <button
                          onClick={handleToggleRestrict}
                          disabled={optionsBusy}
                          className="w-full flex items-center gap-3 p-3.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer text-left"
                        >
                          <UserX className="w-4.5 h-4.5" />
                          {isRestricted ? "Отменить ограничение" : "Ограничить"}
                        </button>
                        <hr className="border-[var(--border)]" />
                        <button
                          onClick={() => {
                            setReportTarget({ type: "USER", id: userId! });
                            setShowOptionsMenu(false);
                          }}
                          className="w-full flex items-center gap-3 p-3.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer text-left"
                        >
                          <Flag className="w-4.5 h-4.5" />
                          Пожаловаться
                        </button>
                        <hr className="border-[var(--border)]" />
                        <button
                          onClick={handleToggleBlock}
                          disabled={optionsBusy}
                          className="w-full flex items-center gap-3 p-3.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer text-left"
                        >
                          <Ban className="w-4.5 h-4.5" />
                          {isBlocked ? "Разблокировать" : "Заблокировать"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
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

      {/* ----------------- HIGHLIGHTS ----------------- */}
      {!(profile.isPrivate && followState !== "following") && (
        <Highlights userId={profile.id} isOwner={false} />
      )}

      {/* ----------------- POSTS GRID ----------------- */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-center border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 py-4 border-t-2 border-black dark:border-white text-black dark:text-white">
            <Grid className="w-4 h-4" />
            <span className="text-[12px] font-bold uppercase tracking-wider">Публикации</span>
          </div>
        </div>

        {profile.isPrivate && followState !== "following" ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">Это закрытый аккаунт</h3>
            <p className="text-sm text-zinc-500 max-w-xs">Подпишитесь, чтобы видеть публикации.</p>
          </div>
        ) : posts.length === 0 ? (
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
                  <SmartImage src={post.image} alt="Post" fill sizes="(max-width: 768px) 33vw, 300px" className="object-cover transition duration-300 group-hover:scale-105" />
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
              // eslint-disable-next-line @next/next/no-img-element -- full-screen lightbox keeps the image's natural aspect ratio, which next/image can't infer for remote sources
              <img src={selectedPost.image} alt="Post" className="max-h-[85vh] w-auto object-contain rounded-xl" />
            )}
          </div>
        </div>
      )}

      {/* ----------------- REPORT MODAL ----------------- */}
      {reportTarget && <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />}
    </div>
  );
}
