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
  X
} from "lucide-react";
import { AppDispatch, RootState } from "./store/store";
import {
  fetchFollowingPosts,
  toggleLikePost,
  addComment,
  addPostFavorite,
  deletePost,
  hydrateLocal
} from "./store/slices/postsSlice";
import {
  getSavedPosts,
  toggleSavedPost,
  getLocalComments,
  addLocalComment
} from "./services/localStore";
import {
  fetchStories,
  viewStory,
  likeStory,
  Story
} from "./store/slices/storiesSlice";
import { api, getFullImageUrl } from "./services/api";
import { PostSkeleton, StoriesSkeleton } from "./components/SkeletonLoader";
import { useApp } from "./context/AppContext";

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
  const { stories, loading: storiesLoading } = useSelector((state: RootState) => state.stories);

  // Suggestions state loaded dynamically
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Active Story Modal Viewer
  const [activeStory, setActiveStory] = useState<Story | null>(null);

  // Animation states for heart popup on double-click
  const [heartAnimPostId, setHeartAnimPostId] = useState<number | null>(null);

  // Handle post commenting input states
  const [commentInputs, setCommentInputs] = useState<{ [key: number]: string }>({});

  // Post options menu (⋯)
  const [menuPostId, setMenuPostId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    if (isLoggedIn) {
      dispatch(fetchFollowingPosts({})).then((action) => {
        if (fetchFollowingPosts.fulfilled.match(action) && currentUser) {
          const loaded = action.payload as { id: number }[];
          const savedIds = getSavedPosts(currentUser.id).map((p) => p.id);
          const comments: Record<number, any[]> = {};
          loaded.forEach((p) => {
            const local = getLocalComments(p.id);
            if (local.length) comments[p.id] = local;
          });
          dispatch(hydrateLocal({ savedIds, comments }));
        }
      });
      dispatch(fetchStories());

      // Fetch suggestions
      const loadSuggestions = async () => {
        try {
          const users = await api.user.getUsers({ pageSize: 5 });
          const formatted = (users || []).map((u: any, idx: number) => ({
            id: u.id || u.userId || idx,
            userId: u.id || u.userId || "",
            username: u.userName || u.username || "user",
            avatar: getFullImageUrl(u.avatar || u.imagePath) || "",
            subtitle: u.about || "Suggested for you",
            followed: false
          }));
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
    if (!currentUser) return;
    const post = posts.find((p) => p.id === postId);
    if (post) {
      toggleSavedPost(currentUser.id, {
        id: post.id,
        userId: post.userId,
        username: post.username,
        avatar: post.avatar,
        image: post.image,
        caption: post.caption,
        likes: post.likes,
        time: post.time,
      });
    }
  };

  const handleAddComment = (postId: number, e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInputs[postId];
    if (!text || !text.trim() || !currentUser) return;

    const comment = text.trim();
    dispatch(addComment({ postId, comment, username: currentUser.username }));
    addLocalComment(postId, { id: Date.now(), username: currentUser.username, text: comment });
    setCommentInputs({ ...commentInputs, [postId]: "" });
  };

  const handleViewStory = (story: Story) => {
    dispatch(viewStory(story.id));
    setActiveStory(story);
  };

  // Auto-advance stories (like real Instagram), 5s each
  useEffect(() => {
    if (!activeStory) return;
    const idx = stories.findIndex((s) => s.id === activeStory.id);
    const timer = setTimeout(() => {
      if (idx >= 0 && idx < stories.length - 1) {
        handleViewStory(stories[idx + 1]);
      } else {
        setActiveStory(null);
      }
    }, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStory, stories]);

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
                <button
                  onClick={() => {
                    setCreateType("story");
                    setCreateOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer outline-none group"
                >
                  <div className="relative p-[2.5px]">
                    <div className="bg-white dark:bg-black p-[2.5px] rounded-full flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                      <img
                        src={currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
                        alt="Your story"
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    </div>
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-white text-[11px] font-bold font-sans">
                      +
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal max-w-[74px] truncate">
                    Ваша история
                  </span>
                </button>
              )}

              {stories.length === 0 && !currentUser ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4 px-2">Нет доступных историй</p>
              ) : (
                stories.map((story) => (
                  <button
                    key={story.id}
                    onClick={() => handleViewStory(story)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer outline-none group"
                  >
                    <div
                      className={`p-[2.5px] rounded-full transition-transform duration-200 group-hover:scale-110 ${
                        story.viewed ? "bg-zinc-200 dark:bg-zinc-800" : "gradient-ring animate-gradient"
                      }`}
                    >
                      <div className="bg-white dark:bg-black p-[2.5px] rounded-full flex items-center justify-center">
                        <img
                          src={story.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
                          alt={story.username}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal max-w-[74px] truncate">
                      {story.username}
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
            posts.map((post) => (
              <article
                key={post.id}
                className="card lift md:rounded-3xl rounded-2xl overflow-hidden flex flex-col w-full animate-fade-up"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Link href={post.userId ? `/u/${post.userId}` : "#"}>
                      <img
                        src={post.avatar}
                        alt={post.username}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-250 dark:border-zinc-900"
                      />
                    </Link>
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
                    <img
                      src={post.image}
                      alt="Post content"
                      className="w-full h-full object-cover"
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
                    <button className="hover:text-zinc-400 hover:scale-110 active:scale-90 transition duration-100">
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
                    {post.caption}
                  </p>

                  {/* Comment details list */}
                  <div className="flex flex-col gap-1 mt-0.5">
                    {post.comments.map((comment: any, index: number) => (
                      <p key={index} className="text-sm text-zinc-800 dark:text-zinc-200">
                        <span className="font-bold mr-2 hover:underline cursor-pointer text-zinc-900 dark:text-white">
                          {comment.username}
                        </span>
                        <span>{comment.text}</span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* Comment Input Box */}
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
              </article>
            ))
          )}
        </div>
      </div>

      {/* Suggestions Sidebar */}
      {currentUser && (
        <aside className="hidden lg:flex flex-col w-[320px] pt-4 select-none bg-white dark:bg-black text-black dark:text-white">
          {/* User Card */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-[44px] h-[44px] rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-sm hover:underline cursor-pointer leading-tight">
                  {currentUser.username}
                </span>
                <span className="text-zinc-450 text-xs font-normal leading-tight mt-0.5">{currentUser.name}</span>
              </div>
            </div>
            <button className="text-blue-500 font-semibold text-[12px] hover:text-blue-400 cursor-pointer">
              Переключить
            </button>
          </div>

          {/* Suggestions Title */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-400 font-bold text-sm">Рекомендации для вас</span>
            <Link href="/explore/people" className="font-bold text-[12px] hover:text-zinc-650 dark:hover:text-zinc-300">
              Все
            </Link>
          </div>

          {/* Suggestion list */}
          <div className="flex flex-col gap-4 mb-8">
            {suggestions.map((sug) => (
              <div key={sug.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={sug.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
                    alt={sug.username}
                    className="w-8 h-8 rounded-full object-cover border border-zinc-100 dark:border-zinc-900"
                  />
                  <div className="flex flex-col max-w-[180px]">
                    <span className="font-bold text-sm hover:underline cursor-pointer truncate leading-none">
                      {sug.username}
                    </span>
                    <div className="flex items-center gap-1 mt-1 truncate">
                      <span className="text-zinc-400 text-xs truncate leading-none">
                        {sug.subtitle}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleFollowSuggestion(sug.id)}
                  className={`font-bold text-xs transition duration-150 cursor-pointer ${
                    sug.followed
                      ? "text-zinc-400 hover:text-white"
                      : "text-blue-500 hover:text-blue-400"
                  }`}
                >
                  {sug.followed ? "Подписан" : "Подписаться"}
                </button>
              </div>
            ))}
          </div>

          {/* Footer links */}
          <footer className="text-zinc-450 text-[11px] leading-snug flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-1 gap-y-0.5">
              {["About", "Help", "Press", "API", "Jobs", "Privacy", "Terms", "Locations", "Language", "Meta Verified"].map((link, idx) => (
                <React.Fragment key={link}>
                  <a href="#" className="hover:underline">{link}</a>
                  {idx < 9 && <span className="select-none text-[8px] mx-0.5 self-center">•</span>}
                </React.Fragment>
              ))}
            </div>
            <span className="uppercase text-[10px] tracking-wider text-zinc-400">© 2026 INSTAGRAM FROM META</span>
          </footer>
        </aside>
      )}

      {/* ----------------- STORY MODAL OVERLAY ----------------- */}
      {activeStory && (
        <div className="fixed inset-0 bg-black/95 z-55 flex items-center justify-center p-4 select-none">
          {/* Close button */}
          <button
            onClick={() => setActiveStory(null)}
            className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2 z-55 cursor-pointer"
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
            className="absolute left-4 p-2 text-white hover:text-zinc-300 disabled:opacity-20 cursor-pointer"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          {/* Story Container */}
          <div className="relative w-full max-w-md h-[80vh] rounded-xl overflow-hidden shadow-2xl flex flex-col bg-zinc-950">
            {/* Progress bar (auto-advance) */}
            <div className="absolute top-2 left-3 right-3 z-20 h-0.5 bg-white/30 rounded overflow-hidden">
              <div key={activeStory.id} className="h-full bg-white origin-left animate-reel-progress" style={{ animationDuration: "5s" }} />
            </div>

            {/* Header info */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-5 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center gap-3">
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

            {/* Bottom action bar: reply + like */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-10 flex items-center gap-3">
              <div className="flex-1 border border-white/40 rounded-full px-4 py-2.5 text-white/80 text-sm select-none">
                Ответить {activeStory.username}...
              </div>
              <button
                onClick={() => dispatch(likeStory(activeStory.id))}
                className="text-white hover:scale-110 active:scale-90 transition"
              >
                <Heart className="w-7 h-7" />
              </button>
            </div>
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
            className="absolute right-4 p-2 text-white hover:text-zinc-300 disabled:opacity-20 cursor-pointer"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </div>
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
    </div>
  );
}
