"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Smile,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Flag,
  MessageCircleOff,
  Trash2,
  UserX
} from "lucide-react";
import { AppDispatch, RootState } from "./store/store";
import {
  fetchFollowingPosts,
  toggleLikePost,
  addComment,
  addPostFavorite,
  deletePost,
  togglePostComments,
  fetchComments,
  deleteComment,
  updatePostCaption,
  archivePost,
  Post
} from "./store/slices/postsSlice";
import {
  fetchStories,
  fetchMyStories,
  viewStory,
  Story
} from "./store/slices/storiesSlice";
import { api, getFullImageUrl } from "./services/api";
import { PostSkeleton, StoriesSkeleton } from "./components/SkeletonLoader";
import { useApp } from "./context/AppContext";
import Avatar from "./components/Avatar";
import SmartImage from "./components/SmartImage";
import ReportModal, { ReportTarget } from "./components/ReportModal";
import HashtagText from "./components/HashtagText";
import StoryViewer from "./components/StoryViewer";

const VerifiedBadge = () => (
  <svg viewBox="0 0 24 24" className="w-[14px] h-[14px] fill-sky-500 text-white flex-shrink-0 inline-block" style={{ verticalAlign: 'middle' }}>
    <path d="M12.003 2.001c.176 0 .343.047.49.128l1.077.492a1.002 1.002 0 0 0 1.383-.94v-1.185c0-.441.282-.828.694-.962l1.13-.368a1.001 1.001 0 0 0 1.258.85l1.129-.282a1 1 0 0 0 1.171.677l1.103.427a1.001 1.001 0 0 0 .918 1.17l.231 1.157a1 1 0 0 0 .736.786l1.185.244a1 1 0 0 0 .548 1.493l-.492 1.077a1 1 0 0 0 .445 1.261l1.185.592c.389.195.592.656.477 1.078l-.348 1.13a1 1 0 0 0 .048 1.336l.794.882c.307.341.307.863 0 1.204l-.794.882a1 1 0 0 0-.048 1.336l.348 1.13c.115.422-.088.883-.477 1.078l-1.185.592a1 1 0 0 0-.445 1.261l.492 1.077a1 1 0 0 0-.548 1.493l-1.185.244a1 1 0 0 0-.736.786l-.231 1.157a1.001 1.001 0 0 0-.918 1.17l-1.103.427a1 1 0 0 0-1.171-.677l-1.129-.282a1.001 1.001 0 0 0-1.258.85l-1.13-.368a1.001 1.001 0 0 0-.694-.962v-1.185a1.002 1.002 0 0 0-1.383-.94l-1.077.492a1 1 0 0 0-.49.128c-.176 0-.343-.047-.49-.128l-1.077-.492a1.002 1.002 0 0 0-1.383.94v1.185c0 .441-.282.828-.694.962l-1.13.368a1.001 1.001 0 0 0-1.258-.85l-1.129.282a1 1 0 0 0-1.171-.677l-1.103-.427a1.001 1.001 0 0 0-.918-1.17l-.231-1.157a1 1 0 0 0-.736-.786l-1.185-.244a1 1 0 0 0-.548-1.493l.492-1.077a1 1 0 0 0-.445-1.261l-1.185-.592c-.389-.195-.592-.656-.477-1.078l.348-1.13a1 1 0 0 0-.048-1.336l-.794-.882a.801.801 0 0 1 0-1.204l.794-.882a1 1 0 0 0 .048-1.336l-.348-1.13c-.115-.422.088-.883.477-1.078l1.185-.592a1 1 0 0 0 .445-1.261l-.492-1.077a1 1 0 0 0 .548-1.493l1.185-.244a1 1 0 0 0 .736-.786l.231-1.157a1.001 1.001 0 0 0 .918-1.17l1.103-.427a1 1 0 0 0 1.171.677l1.129.282a1.001 1.001 0 0 0 1.258-.85l1.13.368c.412.134.694.521.694.962v1.185a1.002 1.002 0 0 0 1.383.94l1.077-.492c.147-.081.314-.128.49-.128zm-1.85 13.35l-3.3-3.3 1.41-1.42 1.89 1.89 4.89-4.89 1.42 1.42-6.31 6.3z" />
  </svg>
);

export default function HomeFeed() {
  const dispatch = useDispatch<AppDispatch>();
  const { setCreateOpen, setCreateType } = useApp();
  const { currentUser, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const { posts, loading: postsLoading } = useSelector((state: RootState) => state.posts);
  const { stories, myStories, loading: storiesLoading } = useSelector((state: RootState) => state.stories);

  // Suggestions state loaded dynamically
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Active Story Modal Viewer — sourced from either `stories` (followed users) or `myStories`.
  // Only the *id* lives here: the story itself is read back from the store on every render, so a
  // like or a poll vote shows up immediately instead of freezing a stale copy in local state.
  const [activeStoryId, setActiveStoryId] = useState<number | null>(null);
  const [viewerSource, setViewerSource] = useState<"stories" | "my">("stories");

  const viewerList = viewerSource === "my" ? myStories : stories;
  const activeStory = activeStoryId === null ? null : viewerList.find((s) => s.id === activeStoryId) || null;

  // Animation states for heart popup on double-click
  const [heartAnimPostId, setHeartAnimPostId] = useState<number | null>(null);

  // Handle post commenting input states
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});

  // Post options menu (⋯)
  const [menuPostId, setMenuPostId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [commentsBusy, setCommentsBusy] = useState(false);

  // Edit-caption modal (owner only)
  const [editPostId, setEditPostId] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const editPost = posts.find((p) => p.id === editPostId) || null;

  // Reporting (post / comment / story)
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  // Comments modal state
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
  const activeCommentsPost = posts.find((p) => p.id === activeCommentsPostId) || null;

  const handleOpenCommentsModal = (postId: number) => {
    setActiveCommentsPostId(postId);
    dispatch(fetchComments(postId));
  };

  const getUserLink = (userId?: string | number) => {
    if (!userId) return "#";
    return userId === currentUser?.id ? "/profile" : `/u/${userId}`;
  };

  const handleDeleteComment = (postId: number, commentId: number) => {
    dispatch(deleteComment({ postId, commentId }));
  };

  const [restrictedFromComment, setRestrictedFromComment] = useState<Set<string>>(new Set());

  const handleRestrictFromComment = async (userId: string) => {
    if (!userId) return;
    try {
      await api.user.restrictUser(userId);
      setRestrictedFromComment((prev) => new Set(prev).add(userId));
    } catch (err) {
      console.error("Failed to restrict user:", err);
    }
  };

  const handleAddCommentModal = (postId: number, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInputs[postId];
    if (!text || !text.trim() || !currentUser) return;

    const comment = text.trim();
    dispatch(addComment({ postId, comment, username: currentUser.username, userId: currentUser.id }));
    setCommentInputs({ ...commentInputs, [postId]: "" });
  };

  const menuPost = posts.find((p) => p.id === menuPostId) || null;
  const isOwnMenuPost = !!(menuPost && currentUser && menuPost.userId === currentUser.id);

  const handleCopyLink = (postId: number) => {
    const url = `${window.location.origin}/?post=${postId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setMenuPostId(null);
    }, 1000);
  };

  const handleDeletePost = (postId: number) => {
    dispatch(deletePost(postId));
    setMenuPostId(null);
  };

  const handleOpenEdit = (post: Post) => {
    setEditPostId(post.id);
    setEditCaption(post.caption || "");
    setMenuPostId(null);
  };

  const handleSaveEdit = async () => {
    if (editPostId === null || editBusy) return;
    setEditBusy(true);
    try {
      await dispatch(updatePostCaption({ postId: editPostId, caption: editCaption.trim() })).unwrap();
      setEditPostId(null);
    } catch (err) {
      console.error("Failed to update caption:", err);
    } finally {
      setEditBusy(false);
    }
  };

  const handleArchivePost = async (post: Post) => {
    setMenuPostId(null);
    try {
      await dispatch(archivePost({ postId: post.id, isArchived: true })).unwrap();
    } catch (err) {
      console.error("Failed to archive post:", err);
    }
  };

  const handleToggleComments = async (post: Post) => {
    if (commentsBusy) return;
    setCommentsBusy(true);
    try {
      await dispatch(togglePostComments({ postId: post.id, allowComments: !post.allowComments })).unwrap();
      setMenuPostId(null);
    } catch (err) {
      console.error("Failed to toggle comments:", err);
    } finally {
      setCommentsBusy(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchFollowingPosts({}));
      dispatch(fetchStories());
      dispatch(fetchMyStories());

      // Fetch suggestions
      const loadSuggestions = async () => {
        try {
          // Ranked by mutual followers; falls back to a plain user list if unavailable.
          let users: any[];
          try {
            users = await api.user.getSuggestedUsers(20);
          } catch {
            users = await api.user.getUsers({ pageSize: 5 });
          }
          const formatted = (users || []).map((u: any, idx: number) => {
            const mutual = u.mutualFollowersCount ?? u.mutualFollowers ?? 0;
            return {
              id: u.id || u.userId || idx,
              userId: u.id || u.userId || "",
              username: u.userName || u.username || "user",
              avatar: getFullImageUrl(u.avatar || u.imagePath) || "",
              subtitle:
                mutual > 0
                  ? `${mutual} ${mutual === 1 ? "общий подписчик" : "общих подписчиков"}`
                  : u.about || "Рекомендуем для вас",
              followed: false,
            };
          });
          setSuggestions(formatted);
        } catch {
          // Fallback static suggestions if fails
          setSuggestions([
            { id: 1, username: "arevia.7", avatar: "", subtitle: "Suggested for you", followed: false },
            { id: 2, username: "𝔍𝔞𝔪𝔦𝔨", avatar: "", subtitle: "Suggested for you", followed: false },
            { id: 3, username: "1001", avatar: "", subtitle: "Suggested for you", followed: false }
          ]);
        }
      };
      loadSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, dispatch, currentUser?.id]);

  const handleLike = (postId: number) => {
    dispatch(toggleLikePost(postId));
  };

  const handleDoubleLike = (postId: number) => {
    setHeartAnimPostId(postId);
    setTimeout(() => setHeartAnimPostId(null), 1000);
    const post = posts.find((p) => p.id === postId);
    if (post && !post.isLiked) {
      dispatch(toggleLikePost(postId));
    }
  };

  const handleSave = (postId: number) => {
    dispatch(addPostFavorite(postId));
  };

  const handleAddComment = (postId: number, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInputs[postId];
    if (!text || !text.trim() || !currentUser) return;

    const comment = text.trim();
    dispatch(addComment({ postId, comment, username: currentUser.username, userId: currentUser.id }));
    setCommentInputs({ ...commentInputs, [postId]: "" });
  };

  // Auto-advance lives inside StoryViewer, which can pause it while the viewer is typing or voting.
  const handleViewStory = (story: Story, source: "stories" | "my" = "stories") => {
    dispatch(viewStory(story.id));
    setViewerSource(source);
    setActiveStoryId(story.id);
  };

  const handleFollowSuggestion = async (id: string | number) => {
    try {
      const sug = suggestions.find((s) => s.id === id);
      if (!sug || !sug.userId) return;
      if (sug.followed) {
        await api.following.unfollow(sug.userId);
      } else {
        await api.following.follow(sug.userId);
      }
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, followed: !s.followed } : s))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Horizontal "Suggestions for you" card row injected into the feed (Instagram-style).
  const renderSuggestionsRow = () => (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-900/60">
        <span className="text-sm font-semibold">Рекомендации для вас</span>
        <Link href="/explore/people" className="text-xs font-semibold text-blue-500 hover:text-blue-300">
          Смотреть все
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar p-3">
        {suggestions.slice(0, 10).map((sug) => (
          <div
            key={`row-${sug.id}`}
            className="flex flex-col items-center gap-2 w-36 flex-shrink-0 border border-zinc-100 dark:border-zinc-900/60 rounded-xl p-3 text-center"
          >
            <Link href={sug.userId ? `/u/${sug.userId}` : "#"} className="shrink-0">
              <Avatar src={sug.avatar} name={sug.username} className="w-16 h-16" />
            </Link>
            <Link
              href={sug.userId ? `/u/${sug.userId}` : "#"}
              className="font-semibold text-xs truncate max-w-full hover:opacity-60"
            >
              {sug.username}
            </Link>
            <span className="text-zinc-500 dark:text-zinc-400 text-[10px] leading-tight line-clamp-2 min-h-[24px]">
              {sug.subtitle}
            </span>
            <button
              onClick={() => handleFollowSuggestion(sug.id)}
              className={`w-full font-semibold text-xs rounded-lg py-1.5 transition-colors cursor-pointer ${
                sug.followed
                  ? "glass text-black dark:text-white"
                  : "btn-grad text-white hover:opacity-90"
              }`}
            >
              {sug.followed ? "Подписан" : "Подписаться"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex max-w-[935px] mx-auto w-full px-4 md:py-8 justify-between gap-16 select-none text-black dark:text-white transition-colors duration-200">
      
      {/* Feed Area */}
      <div className="flex-1 max-w-[470px] mx-auto md:mx-0 flex flex-col gap-6">
        
        {/* Stories Section */}
        <div className="relative flex items-center w-full border-b border-zinc-100 dark:border-zinc-900 pb-4">
          {storiesLoading ? (
            <StoriesSkeleton />
          ) : (
            <div className="flex gap-4.5 py-2 overflow-x-auto no-scrollbar scroll-smooth w-full">
              {currentUser && (
                <div
                  onClick={() => {
                    if (myStories.length > 0) {
                      handleViewStory(myStories[0], "my");
                    } else {
                      setCreateType("story");
                      setCreateOpen(true);
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer outline-none group"
                >
                  <div className="relative p-[2.5px]">
                    <div
                      className={`p-[2.5px] rounded-full transition-transform duration-200 group-hover:scale-110 ${
                        myStories.length > 0
                          ? myStories.every((s) => s.viewed)
                            ? "bg-zinc-300 dark:bg-zinc-700"
                            : "gradient-ring animate-gradient"
                          : ""
                      }`}
                    >
                      <div className="bg-white dark:bg-black p-[2.5px] rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                        <Avatar src={getFullImageUrl(currentUser.avatar)} name={currentUser.username} className="w-14 h-14" alt="Your story" />
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateType("story");
                        setCreateOpen(true);
                      }}
                      className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-white text-[11px] font-bold font-sans cursor-pointer"
                      title="Добавить историю"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal max-w-[74px] truncate">
                    Ваша история
                  </span>
                </div>
              )}

              {stories.filter((s) => s.userId !== currentUser?.id).length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4 px-2">Нет доступных историй</p>
              ) : (
                stories
                  .filter((s) => s.userId !== currentUser?.id)
                  .map((story) => (
                  <button
                    key={story.id}
                    onClick={() => handleViewStory(story, "stories")}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer outline-none group"
                  >
                    <div
                      className={`p-[2.5px] rounded-full transition-transform duration-200 group-hover:scale-110 ${
                        story.viewed
                          ? "bg-zinc-300 dark:bg-zinc-700"
                          : story.isForCloseFriends
                            ? "bg-green-500"
                            : "gradient-ring animate-gradient"
                      }`}
                    >
                      <div className="bg-white dark:bg-black p-[2.5px] rounded-full flex items-center justify-center">
                        <Avatar src={story.avatar} name={story.username} className="w-14 h-14" />
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal max-w-[74px] truncate flex items-center gap-1">
                      {story.isForCloseFriends && <Star className="w-2.5 h-2.5 fill-green-500 text-green-500 flex-shrink-0" />}
                      <span className="truncate">{story.username}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {stories.length > 0 && (
            <button 
              onClick={() => {
                const el = document.querySelector('.overflow-x-auto');
                if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
              }}
              className="absolute right-0 top-[34px] -translate-y-1/2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition z-10 border border-zinc-200"
            >
              <ChevronRight className="w-3.5 h-3.5 text-zinc-800 stroke-[3px]" />
            </button>
          )}
        </div>

        {/* Posts Feed */}
        <div className="flex flex-col gap-6">
          {postsLoading ? (
            Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
          ) : posts.length === 0 ? (
            <div className="text-center py-20 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <h2 className="text-lg font-bold">Добро пожаловать в Instagram</h2>
              <p className="text-sm text-zinc-500 mt-2 px-6">Ваша лента пока пуста. Подпишитесь на кого-нибудь, чтобы видеть их посты.</p>
            </div>
          ) : (
            posts.map((post, postIndex) => {
              const authorStory = stories.find((s) => s.userId === post.userId) ||
                                  (post.userId === currentUser?.id && myStories.length > 0 ? myStories[0] : null);
              return (
                <React.Fragment key={post.id}>
                {postIndex === 2 && suggestions.length > 0 && renderSuggestionsRow()}
                <article
                  className="border border-[var(--border)] rounded-xl overflow-hidden flex flex-col w-full animate-fade-up bg-transparent"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      {authorStory ? (
                        <button
                          onClick={() => handleViewStory(authorStory, post.userId === currentUser?.id ? "my" : "stories")}
                          className={`p-[1.5px] rounded-full transition duration-150 cursor-pointer active:scale-95 flex-shrink-0 ${
                            authorStory.viewed
                              ? "bg-zinc-300 dark:bg-zinc-700"
                              : authorStory.isForCloseFriends
                                ? "bg-green-500"
                                : "gradient-ring"
                          }`}
                        >
                          <div className="bg-white dark:bg-black p-[1.5px] rounded-full">
                            <Avatar src={post.avatar} name={post.username} className="w-8 h-8" />
                          </div>
                        </button>
                      ) : (
                        <Link href={post.userId ? `/u/${post.userId}` : "#"} className="flex-shrink-0">
                          <Avatar src={post.avatar} name={post.username} className="w-8 h-8 border border-zinc-200 dark:border-zinc-800" />
                        </Link>
                      )}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 flex-wrap">
                        {post.collabUser ? (
                          <div className="flex items-center gap-1 text-sm font-semibold text-zinc-900 dark:text-white">
                            <Link href={post.userId ? `/u/${post.userId}` : "#"} className="cursor-pointer hover:text-zinc-500">{post.username}</Link>
                            {post.isVerified && <VerifiedBadge />}
                            <span className="font-normal text-zinc-400 mx-0.5">and</span>
                            <span className="cursor-pointer hover:text-zinc-500">{post.collabUser}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-sm font-semibold text-zinc-900 dark:text-white">
                            <Link href={post.userId ? `/u/${post.userId}` : "#"} className="cursor-pointer hover:text-zinc-500">{post.username}</Link>
                            {post.isVerified && <VerifiedBadge />}
                          </div>
                        )}
                        
                        <span className="text-zinc-400 text-[10px] select-none">•</span>
                        <span className="text-zinc-400 text-xs font-normal">{post.time}</span>
                      </div>
                      {post.location && (
                        <span className="text-xs text-zinc-400 font-normal leading-tight mt-0.5">{post.location}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setMenuPostId(post.id)}
                    className="text-zinc-650 dark:text-white p-1 hover:text-zinc-400 cursor-pointer"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Media with double-tap like */}
                <div
                  className="relative aspect-square w-full select-none cursor-pointer overflow-hidden bg-zinc-50 dark:bg-zinc-950"
                  onDoubleClick={() => handleDoubleLike(post.id)}
                >
                  {post.image.toLowerCase().endsWith('.mp4') || post.image.toLowerCase().endsWith('.mov') || post.image.toLowerCase().endsWith('.webm') ? (
                    <video
                      src={post.image}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <SmartImage
                      src={post.image}
                      alt="Post content"
                      fill
                      sizes="(max-width: 768px) 100vw, 470px"
                      className="object-cover"
                    />
                  )}

                  {/* Big Heart Animation */}
                  {heartAnimPostId === post.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Heart className="w-28 h-28 text-white fill-white drop-shadow-2xl animate-heart-burst stroke-[1px]" />
                    </div>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="flex justify-between items-center px-3.5 py-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post.id)}
                      className="transition duration-100 hover:scale-110 active:scale-90"
                    >
                      <Heart
                        className={`w-6 h-6 ${
                          post.isLiked
                            ? "text-red-500 fill-red-500 animate-in zoom-in-75 duration-100"
                            : "text-zinc-800 dark:text-white hover:text-zinc-400"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleOpenCommentsModal(post.id)}
                      className="hover:text-zinc-400 hover:scale-110 active:scale-90 transition duration-100"
                    >
                      <MessageCircle className="w-6 h-6 text-zinc-800 dark:text-white" />
                    </button>
                    <button className="hover:text-zinc-400 hover:scale-110 active:scale-90 transition duration-100">
                      <Send className="w-6 h-6 text-zinc-800 dark:text-white" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleSave(post.id)}
                    className="hover:text-zinc-400 hover:scale-110 active:scale-90 transition duration-100"
                  >
                    <Bookmark
                      className={`w-6 h-6 ${
                        post.isSaved
                          ? "text-zinc-800 dark:text-white fill-current"
                          : "text-zinc-800 dark:text-white"
                      }`}
                    />
                  </button>
                </div>

                {/* Likes & Info */}
                <div className="px-3.5 pb-3.5 flex flex-col gap-1.5">
                  <span className="font-bold text-sm text-zinc-900 dark:text-white">
                    {post.likes.toLocaleString()} likes
                  </span>
                  
                  {/* Caption */}
                  <p className="text-sm text-zinc-900 dark:text-white leading-tight">
                    <span className="font-bold mr-2 hover:underline cursor-pointer">{post.username}</span>
                    <HashtagText text={post.caption} />
                  </p>

                  {/* Comment details list */}
                  {post.allowComments && post.comments.length > 2 && (
                    <button
                      onClick={() => handleOpenCommentsModal(post.id)}
                      className="text-xs text-zinc-500 hover:text-zinc-650 dark:text-zinc-400 dark:hover:text-zinc-300 font-medium text-left mt-1 cursor-pointer"
                    >
                      Посмотреть все комментарии ({post.comments.length})
                    </button>
                  )}

                  {post.allowComments && (
                    <div className="flex flex-col gap-1 mt-0.5">
                      {post.comments.slice(-2).map((comment, index: number) => (
                        <p key={index} className="group/c text-sm text-zinc-800 dark:text-zinc-200 flex items-start gap-1.5">
                          <span className="flex-1">
                            <Link href={comment.userId ? `/u/${comment.userId}` : "#"} className="font-bold mr-2 hover:underline text-zinc-900 dark:text-white">
                              {comment.username}
                            </Link>
                            <span>{comment.text}</span>
                          </span>
                          {currentUser && (comment.userId === currentUser.id || post.userId === currentUser.id) && (
                            <button
                              onClick={() => handleDeleteComment(post.id, comment.id)}
                              title="Удалить комментарий"
                              className="p-0.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover/c:opacity-100 transition cursor-pointer flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {currentUser && comment.userId !== currentUser.id && (
                            <button
                              onClick={() => setReportTarget({ type: "COMMENT", id: String(comment.id) })}
                              title="Пожаловаться на комментарий"
                              className="p-0.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover/c:opacity-100 transition cursor-pointer flex-shrink-0"
                            >
                              <Flag className="w-3 h-3" />
                            </button>
                          )}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Comment Input Box — hidden when the author disabled comments */}
                {post.allowComments ? (
                  <form
                    onSubmit={(e) => handleAddComment(post.id, e)}
                    className="border-t border-zinc-100 dark:border-zinc-900/60 px-3.5 py-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button type="button" className="text-zinc-800 dark:text-white hover:text-zinc-400">
                        <Smile className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        placeholder="Добавить комментарий..."
                        value={commentInputs[post.id] || ""}
                        onChange={(e) =>
                          setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                        }
                        className="bg-transparent text-sm w-full outline-none placeholder-zinc-450 border-none ring-0 p-0 text-zinc-900 dark:text-white"
                      />
                    </div>
                    {(commentInputs[post.id] || "").trim() && (
                      <button
                        type="submit"
                        className="text-blue-500 font-semibold text-sm hover:text-blue-400 cursor-pointer"
                      >
                        Опубликовать
                      </button>
                    )}
                  </form>
                ) : (
                  <div className="border-t border-zinc-100 dark:border-zinc-900/60 px-3.5 py-3.5 flex items-center justify-center gap-2 text-zinc-450 dark:text-zinc-500">
                    <MessageCircleOff className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-medium">Комментарии к этой публикации отключены</span>
                  </div>
                )}
              </article>
              </React.Fragment>
            ); })
          )}
        </div>
      </div>

      {/* Suggestions Sidebar — sticky so it stays put while the feed scrolls */}
      {currentUser && (
        <aside className="hidden lg:flex flex-col w-[320px] shrink-0 self-start sticky top-8 pt-4 select-none text-black dark:text-white">
          {/* Current user card */}
          <div className="flex items-center gap-3 mb-5">
            <Link href="/profile" className="shrink-0">
              <Avatar src={getFullImageUrl(currentUser.avatar)} name={currentUser.username} className="w-11 h-11" />
            </Link>
            <div className="flex flex-col min-w-0 flex-1">
              <Link href="/profile" className="font-semibold text-sm leading-tight truncate hover:opacity-60 transition-opacity">
                {currentUser.username}
              </Link>
              <span className="text-zinc-500 dark:text-zinc-400 text-sm leading-tight truncate">{currentUser.name}</span>
            </div>
            <button className="text-blue-500 font-semibold text-xs hover:text-blue-300 transition-colors cursor-pointer shrink-0">
              Переключить
            </button>
          </div>

          {/* Suggestions header */}
          <div className="flex justify-between items-center mb-1">
            <span className="text-zinc-500 dark:text-zinc-400 font-semibold text-sm">Рекомендации для вас</span>
            <Link href="/explore/people" className="font-semibold text-xs hover:opacity-60 transition-opacity">
              Все
            </Link>
          </div>

          {/* Suggestion list */}
          <div className="flex flex-col mb-4">
            {suggestions.map((sug) => (
              <div key={sug.id} className="flex items-center gap-3 py-2 -mx-2 px-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors">
                <Link href={sug.userId ? `/u/${sug.userId}` : "#"} className="shrink-0">
                  <Avatar src={sug.avatar} name={sug.username} className="w-11 h-11" />
                </Link>
                <div className="flex flex-col min-w-0 flex-1">
                  <Link href={sug.userId ? `/u/${sug.userId}` : "#"} className="font-semibold text-sm hover:opacity-60 transition-opacity truncate leading-tight">
                    {sug.username}
                  </Link>
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs truncate leading-tight mt-0.5">
                    {sug.subtitle}
                  </span>
                </div>
                <button
                  onClick={() => handleFollowSuggestion(sug.id)}
                  className={`font-semibold text-xs transition-colors cursor-pointer flex-shrink-0 ml-2 ${
                    sug.followed
                      ? "text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                      : "text-blue-500 hover:text-blue-300"
                  }`}
                >
                  {sug.followed ? "Подписан" : "Подписаться"}
                </button>
              </div>
            ))}
          </div>

          {/* Footer links */}
          <footer className="text-zinc-400 dark:text-zinc-500 text-[11px] leading-snug flex flex-col gap-3.5 mt-2">
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {["About", "Help", "Press", "API", "Jobs", "Privacy", "Terms", "Locations", "Language", "Meta Verified"].map((link, idx) => (
                <React.Fragment key={link}>
                  <a href="#" className="hover:underline">{link}</a>
                  {idx < 9 && <span className="select-none text-[8px] mx-0.5 self-center">•</span>}
                </React.Fragment>
              ))}
            </div>
            <span className="uppercase text-[10px] tracking-wider">© 2026 INSTAGRAM FROM META</span>
          </footer>
        </aside>
      )}

      {/* ----------------- STORY MODAL OVERLAY ----------------- */}
      {activeStory && (
        <StoryViewer
          key={activeStory.id}
          story={activeStory}
          list={viewerList}
          currentUserId={currentUser?.id}
          onNavigate={(next) => handleViewStory(next, viewerSource)}
          onClose={() => setActiveStoryId(null)}
          onReport={(storyId) => setReportTarget({ type: "STORY", id: String(storyId) })}
        />
      )}

      {/* ----------------- POST OPTIONS MENU ----------------- */}
      {menuPost && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          onClick={() => setMenuPostId(null)}
        >
          <div
            className="glass-strong w-full max-w-sm rounded-3xl overflow-hidden shadow-soft-lg flex flex-col divide-y divide-zinc-200 dark:divide-zinc-700/60 text-center animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {isOwnMenuPost && (
              <button
                onClick={() => handleDeletePost(menuPost.id)}
                className="py-3.5 text-sm font-bold text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer"
              >
                Удалить
              </button>
            )}
            {isOwnMenuPost && (
              <button
                onClick={() => handleOpenEdit(menuPost)}
                className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer"
              >
                Редактировать
              </button>
            )}
            {isOwnMenuPost && (
              <button
                onClick={() => handleArchivePost(menuPost)}
                className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer"
              >
                Архивировать
              </button>
            )}
            {isOwnMenuPost && (
              <button
                onClick={() => handleToggleComments(menuPost)}
                disabled={commentsBusy}
                className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer disabled:opacity-60"
              >
                {menuPost.allowComments ? "Выключить комментарии" : "Включить комментарии"}
              </button>
            )}
            {!isOwnMenuPost && (
              <button
                onClick={() => {
                  setReportTarget({ type: "POST", id: String(menuPost.id) });
                  setMenuPostId(null);
                }}
                className="py-3.5 text-sm font-bold text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer"
              >
                Пожаловаться
              </button>
            )}
            {menuPost.userId && (
              <Link
                href={`/u/${menuPost.userId}`}
                onClick={() => setMenuPostId(null)}
                className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer"
              >
                Перейти к профилю
              </Link>
            )}
            <button
              onClick={() => handleCopyLink(menuPost.id)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer"
            >
              {copied ? "Ссылка скопирована ✓" : "Скопировать ссылку"}
            </button>
            <button
              onClick={() => setMenuPostId(null)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-750 cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* ----------------- EDIT CAPTION MODAL ----------------- */}
      {editPost && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4"
          onClick={() => !editBusy && setEditPostId(null)}
        >
          <div
            className="glass-strong w-full max-w-md rounded-3xl overflow-hidden shadow-soft-lg animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700/60">
              <button
                onClick={() => setEditPostId(null)}
                disabled={editBusy}
                className="text-sm text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer disabled:opacity-60"
              >
                Отмена
              </button>
              <span className="text-sm font-bold">Редактировать</span>
              <button
                onClick={handleSaveEdit}
                disabled={editBusy}
                className="text-sm font-bold text-blue-500 hover:text-blue-300 cursor-pointer disabled:opacity-60"
              >
                {editBusy ? "Сохранение…" : "Готово"}
              </button>
            </div>
            <div className="flex gap-3 p-4">
              <SmartImage
                src={editPost.image}
                alt=""
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                placeholder="Добавьте подпись…"
                rows={4}
                autoFocus
                className="flex-1 bg-transparent text-sm resize-none outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* ----------------- REPORT MODAL ----------------- */}
      {reportTarget && <ReportModal target={reportTarget} onClose={() => setReportTarget(null)} />}

      {/* ----------------- COMMENTS MODAL OVERLAY ----------------- */}
      {activeCommentsPostId !== null && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setActiveCommentsPostId(null)}
        >
          <div
            className="glass-strong rounded-3xl overflow-hidden shadow-soft-lg w-full max-w-lg max-h-[80vh] flex flex-col relative animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-base">Комментарии</h3>
              <button
                onClick={() => setActiveCommentsPostId(null)}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-left">
              {/* Post Caption as Pin Comment */}
              {activeCommentsPost && activeCommentsPost.caption && (
                <div className="flex items-start gap-3 text-sm">
                  <Link href={getUserLink(activeCommentsPost.userId)}>
                    <Avatar src={activeCommentsPost.avatar} name={activeCommentsPost.username} className="w-8 h-8 flex-shrink-0 border border-zinc-200 dark:border-zinc-800" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <p className="leading-snug break-words">
                      <Link href={getUserLink(activeCommentsPost.userId)} className="font-bold mr-2 hover:underline">
                        {activeCommentsPost.username}
                      </Link>
                      <HashtagText text={activeCommentsPost.caption} />
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1 block">{activeCommentsPost.time}</span>
                  </div>
                </div>
              )}

              {activeCommentsPost && activeCommentsPost.caption && <hr className="border-zinc-150 dark:border-zinc-800" />}

              {/* Loader / Empty state / Comments */}
              {!activeCommentsPost ? (
                <div className="flex-1 flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-850 rounded-full animate-spin" />
                </div>
              ) : activeCommentsPost.comments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-450 gap-2 py-10">
                  <MessageCircle className="w-10 h-10 text-zinc-300" />
                  <span className="text-sm font-medium">Комментариев пока нет.</span>
                  <span className="text-xs text-zinc-400">Будьте первым, кто оставит комментарий!</span>
                </div>
              ) : (
                activeCommentsPost.comments.map((comment) => (
                  <div key={comment.id} className="group/modal-c flex items-start gap-3 text-sm">
                    <Link href={getUserLink(comment.userId)}>
                      <Avatar name={comment.username} className="w-8 h-8 flex-shrink-0" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="leading-snug break-words">
                        <Link href={getUserLink(comment.userId)} className="font-bold mr-2 hover:underline">
                          {comment.username}
                        </Link>
                        {comment.text}
                      </p>
                      <span className="text-[10px] text-zinc-400 mt-1 block">Just now</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Restrict action — for other people's comments */}
                      {currentUser && comment.userId && comment.userId !== currentUser.id && (
                        <button
                          onClick={() => handleRestrictFromComment(comment.userId)}
                          disabled={restrictedFromComment.has(comment.userId)}
                          className="p-1 opacity-0 group-hover/modal-c:opacity-100 transition cursor-pointer text-zinc-400 hover:text-black dark:hover:text-white animate-in fade-in disabled:opacity-40 disabled:cursor-default"
                          title={restrictedFromComment.has(comment.userId) ? "Пользователь ограничен" : "Ограничить пользователя"}
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                      {/* Delete action */}
                      {currentUser && (comment.userId === currentUser.id || activeCommentsPost.userId === currentUser.id) && (
                        <button
                          onClick={() => handleDeleteComment(activeCommentsPost.id, comment.id)}
                          className="p-1 hover:text-red-500 opacity-0 group-hover/modal-c:opacity-100 transition cursor-pointer text-zinc-400 animate-in fade-in"
                          title="Удалить комментарий"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            {activeCommentsPost && activeCommentsPost.allowComments && (
              <form
                onSubmit={(e) => handleAddCommentModal(activeCommentsPost.id, e)}
                className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/20"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Smile className="w-5 h-5 text-zinc-550" />
                  <input
                    type="text"
                    placeholder="Добавить комментарий..."
                    value={commentInputs[activeCommentsPost.id] || ""}
                    onChange={(e) =>
                      setCommentInputs({ ...commentInputs, [activeCommentsPost.id]: e.target.value })
                    }
                    className="bg-transparent text-sm w-full outline-none placeholder-zinc-450 border-none ring-0 p-0 text-zinc-900 dark:text-white"
                  />
                </div>
                {(commentInputs[activeCommentsPost.id] || "").trim() && (
                  <button
                    type="submit"
                    className="text-blue-500 font-semibold text-sm hover:text-blue-400 cursor-pointer"
                  >
                    Опубликовать
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
