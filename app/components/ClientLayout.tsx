"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useApp } from "../context/AppContext";
import { logout, initializeToken, fetchMyProfile } from "../store/slices/authSlice";
import { createPost, createReel } from "../store/slices/postsSlice";
import { createStory } from "../store/slices/storiesSlice";
import { AppDispatch, RootState } from "../store/store";
import { getStoredToken, api, getFullImageUrl } from "../services/api";
import { ACTIVITY_PING_INTERVAL_MS } from "../lib/presence";
import NotificationsPanel from "./NotificationsPanel";
import Avatar from "./Avatar";
import MusicPicker, { MusicTrack } from "./MusicPicker";
import {
  Home,
  Search,
  Compass,
  Film,
  Send,
  Heart,
  PlusSquare,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Image as ImageIcon,
  Smile,
  MapPin,
  ChevronDown,
  User,
  Settings,
  Bookmark,
  Music,
  Star,
  Globe
} from "lucide-react";

/** One row of "Недавнее": either a visited profile or a raw text query. */
interface SearchHistoryItem {
  id: number;
  /** Set when the entry is a person; null for a plain text query. */
  userId: string | null;
  userName: string;
  avatar: string;
  queryText: string;
}

const formatSearchHistory = (h: any): SearchHistoryItem | null => {
  const id = h?.id ?? h?.searchHistoryId;
  if (id == null) return null;

  // The searched user may be nested or flattened onto the row.
  const user = h.searchedUser || h.user || h.userSearch || null;
  const userId = user?.id || user?.userId || h.searchedUserId || null;

  return {
    id,
    userId: userId || null,
    userName: user?.userName || user?.username || h.userName || "",
    avatar: getFullImageUrl(user?.avatar || user?.imagePath || h.avatar),
    queryText: h.queryText || h.text || h.searchText || "",
  };
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const { theme, toggleTheme, isCreateOpen, setCreateOpen, createType, setCreateType } = useApp();
  const { isLoggedIn, currentUser } = useSelector((state: RootState) => state.auth);
  
  const pathname = usePathname();
  const router = useRouter();

  const [isInitialized, setIsInitialized] = useState(false);

  // Create modal internal states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reel-specific: audio track picked from the music catalogue
  const [reelTrack, setReelTrack] = useState<MusicTrack | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [storyMusicDuration, setStoryMusicDuration] = useState(15);

  // Story-specific: share with everyone vs close friends only
  const [isForCloseFriends, setIsForCloseFriends] = useState(false);

  // Story-specific: optional interactive sticker (poll or open question)
  const [stickerKind, setStickerKind] = useState<"NONE" | "POLL" | "QUESTION">("NONE");
  const [stickerQuestion, setStickerQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<[string, string]>(["Да", "Нет"]);
  
  // More dropdown menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Search overlay (for desktop sidebar)
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingList, setFollowingList] = useState<any[]>([]);

  // Recent searches ("Недавнее")
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Notifications panel
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Load subscriptions when search panel opens to know follow status
  React.useEffect(() => {
    if (showSearchPanel && currentUser) {
      api.following.getSubscriptions(currentUser.id)
        .then((subs) => setFollowingList(subs || []))
        .catch(err => console.error(err));
    }
  }, [showSearchPanel, currentUser]);

  // Debounced user search
  React.useEffect(() => {
    if (!showSearchPanel) return;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try {
        const users = await api.user.getUsers({ userName: q });
        setSearchResults(users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, showSearchPanel]);

  const handleFollowToggle = async (user: any) => {
    const uid = user.id || user.userId;
    const isCurrentlyFollowing = followingList.some((s: any) => s.id === uid || s.userName === user.userName);
    try {
      if (isCurrentlyFollowing) {
        await api.following.unfollow(uid);
        setFollowingList(prev => prev.filter(s => s.userName !== user.userName && s.id !== uid));
      } else {
        await api.following.follow(uid);
        setFollowingList(prev => [...prev, user]);
      }
    } catch (err) {
      console.error("Failed to toggle follow status:", err);
    }
  };

  const handleMessageUser = async (userId: string) => {
    try {
      await api.chat.createChat(userId);
      setShowSearchPanel(false);
      router.push("/direct/inbox");
    } catch (err) {
      console.error("Failed to start chat:", err);
    }
  };

  // ---- Recent searches ----
  const refreshSearchHistory = React.useCallback(() => {
    setHistoryLoading(true);
    api.user.getSearchHistories()
      .then((list) => setSearchHistory((list || []).map(formatSearchHistory).filter(Boolean) as SearchHistoryItem[]))
      .catch(() => setSearchHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  React.useEffect(() => {
    if (showSearchPanel && currentUser) refreshSearchHistory();
  }, [showSearchPanel, currentUser, refreshSearchHistory]);

  const handleDeleteHistoryItem = async (id: number) => {
    const snapshot = searchHistory;
    setSearchHistory((prev) => prev.filter((h) => h.id !== id));
    try {
      await api.user.deleteSearchHistory(id);
    } catch (err) {
      console.error("Failed to delete search history item:", err);
      setSearchHistory(snapshot);
    }
  };

  const handleClearHistory = async () => {
    const snapshot = searchHistory;
    setSearchHistory([]);
    try {
      await api.user.deleteSearchHistories();
    } catch (err) {
      console.error("Failed to clear search history:", err);
      setSearchHistory(snapshot);
    }
  };

  const goToUser = (id: string) => {
    api.user.addSearchHistory({ searchedUserId: id }).catch(() => {
      /* recording history must never block navigation */
    });
    setShowSearchPanel(false);
    setSearchQuery("");
    setSearchResults([]);
    router.push(`/u/${id}`);
  };

  // Handle token & profile initialization on mount
  React.useEffect(() => {
    const initAuth = async () => {
      dispatch(initializeToken());
      const token = getStoredToken();
      if (token) {
        try {
          await dispatch(fetchMyProfile()).unwrap();
        } catch (err) {
          console.error("Failed to restore profile:", err);
        }
      }
      setIsInitialized(true);
    };
    initAuth();
  }, [dispatch]);

  // Redirect to login if not logged in
  React.useEffect(() => {
    if (isInitialized && !isLoggedIn && pathname !== "/login" && pathname !== "/accounts/emailsignup") {
      router.push("/login");
    }
  }, [isInitialized, isLoggedIn, pathname, router]);

  // Announce presence while the tab is actually in the foreground. Pinging from a
  // hidden tab would keep the user "online" long after they walked away.
  React.useEffect(() => {
    if (!isLoggedIn) return;

    const ping = () => {
      if (document.hidden) return;
      api.user.updateActivity().catch(() => {
        /* presence is best-effort — never surface it to the user */
      });
    };

    ping();
    const timer = setInterval(ping, ACTIVITY_PING_INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [isLoggedIn]);

  // If on login or signup pages, just show content without sidebar/navs
  if (pathname === "/login" || pathname === "/accounts/emailsignup") {
    return <>{children}</>;
  }

  if (!isInitialized || (isLoggedIn && !currentUser)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-black dark:text-white">
        <div className="relative w-16 h-16 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
          <svg className="w-10 h-10 text-white fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </div>
        <div className="mt-4 w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 dark:border-zinc-700 dark:border-t-zinc-200 rounded-full animate-spin" />
      </div>
    );
  }

  // Handle mock image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setSelectedImage(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setSelectedImage(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetCreateModal = () => {
    setCreateOpen(false);
    setSelectedImage(null);
    setImageFile(null);
    setCaption("");
    setReelTrack(null);
    setStoryMusicDuration(15);
    setShowMusicPicker(false);
    setIsForCloseFriends(false);
    setStickerKind("NONE");
    setStickerQuestion("");
    setPollOptions(["Да", "Нет"]);
    setUploadSuccess(false);
    setUploadError(null);
  };

  const handleShare = async () => {
    if (!imageFile) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      if (createType === "story") {
        const question = stickerQuestion.trim();
        // A sticker only ships if it's actually filled in — a half-typed poll is dropped.
        const sticker =
          stickerKind === "POLL" && question && pollOptions[0].trim() && pollOptions[1].trim()
            ? { type: "POLL" as const, question, options: [pollOptions[0].trim(), pollOptions[1].trim()] }
            : stickerKind === "QUESTION" && question
              ? { type: "QUESTION" as const, question }
              : undefined;

        const finalTrack = reelTrack
          ? {
              ...reelTrack,
              durationMs: storyMusicDuration * 1000,
            }
          : null;

        await dispatch(createStory({ file: imageFile, isForCloseFriends, sticker, musicTrack: finalTrack })).unwrap();
      } else if (createType === "reel") {
        await dispatch(createReel({
          file: imageFile,
          caption,
          audioId: reelTrack?.id,
          audioName: reelTrack?.title,
          audioArtist: reelTrack?.artist,
        })).unwrap();
      } else {
        await dispatch(createPost({
          title: caption || "Instagram Post",
          content: caption,
          images: [imageFile],
          isReel: false
        })).unwrap();
      }

      setIsUploading(false);
      setUploadSuccess(true);
      const targetPath = createType === "reel" ? "/reels" : (createType === "story" ? "/" : "/profile");
      setTimeout(() => {
        resetCreateModal();
        router.push(targetPath);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setUploadError(typeof err === "string" ? err : err?.message || "Не удалось загрузить. Попробуйте ещё раз.");
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    setShowMoreMenu(false);
    router.push("/login");
  };

  const navItems = [
    { label: "Главная", href: "/", icon: Home },
    { label: "Поиск", href: "#", icon: Search, onClick: () => setShowSearchPanel(!showSearchPanel) },
    { label: "Интересное", href: "/explore", icon: Compass },
    { label: "Reels", href: "/reels", icon: Film },
    { label: "Сообщения", href: "/direct/inbox", icon: Send },
    { label: "Уведомления", href: "#", icon: Heart, onClick: () => { setShowNotifPanel(true); setShowSearchPanel(false); } },
    { label: "Создать", href: "#", icon: PlusSquare, onClick: () => setCreateOpen(true) },
    { label: "Профиль", href: "/profile", icon: User }
  ];

  const userAvatar = currentUser?.avatar || "";

  return (
    <div className="h-screen flex flex-col md:flex-row text-black dark:text-white transition-colors duration-200">

      {/* ----------------- DESKTOP & TABLET SIDEBAR ----------------- */}
      <aside className={`hidden md:flex flex-col glass h-screen sticky top-0 z-40 transition-all duration-300 ${showSearchPanel || showNotifPanel ? "w-[72px]" : "w-[72px] xl:w-64"} p-3 justify-between`} style={{ borderRight: "1px solid var(--border)" }}>
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link href="/" className="h-14 flex items-center px-3 mt-4">
            {showSearchPanel || showNotifPanel ? (
              <svg className="w-7 h-7 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            ) : (
              <>
                <span className="hidden xl:inline font-serif text-2xl font-bold tracking-wider italic bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent">Instagram</span>
                <span className="xl:hidden">
                  <svg className="w-7 h-7 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </span>
              </>
            )}
          </Link>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-2">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <div key={idx}>
                  {item.onClick ? (
                    <button
                      onClick={item.onClick}
                      className={`group w-full flex items-center gap-4 p-3 rounded-2xl press transition duration-200 text-left cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 ${
                        isActive ? "bg-black/5 dark:bg-white/8" : ""
                      }`}
                    >
                      {item.label === "Профиль" ? (
                        <Avatar
                          src={userAvatar}
                          name={currentUser?.username}
                          alt="Profile"
                          className={`w-6 h-6 border ${
                            isActive ? "border-black dark:border-white ring-2 ring-zinc-200 dark:ring-zinc-800" : "border-zinc-300 dark:border-zinc-700"
                          }`}
                        />
                      ) : (
                        <Icon className={`w-6 h-6 transition-transform duration-200 group-hover:scale-110 ${isActive ? "stroke-[2.5px] text-[var(--accent-2)]" : "stroke-[2px]"}`} />
                      )}
                      <span className={`text-base hidden ${showSearchPanel || showNotifPanel ? "" : "xl:inline"} ${isActive ? "font-bold" : "font-normal"}`}>
                        {item.label}
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`group w-full flex items-center gap-4 p-3 rounded-2xl press transition duration-200 hover:bg-black/5 dark:hover:bg-white/5 ${
                        isActive ? "bg-black/5 dark:bg-white/8" : ""
                      }`}
                    >
                      {item.label === "Профиль" ? (
                        <Avatar
                          src={userAvatar}
                          name={currentUser?.username}
                          alt="Profile"
                          className={`w-6 h-6 border ${
                            isActive ? "border-black dark:border-white ring-2 ring-zinc-200 dark:ring-zinc-800" : "border-zinc-300 dark:border-zinc-700"
                          }`}
                        />
                      ) : (
                        <Icon className={`w-6 h-6 transition-transform duration-200 group-hover:scale-110 ${isActive ? "stroke-[2.5px] text-[var(--accent-2)]" : "stroke-[2px]"}`} />
                      )}
                      <span className={`text-base hidden ${showSearchPanel || showNotifPanel ? "" : "xl:inline"} ${isActive ? "font-bold" : "font-normal"}`}>
                        {item.label}
                      </span>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* More Menu Trigger */}
        <div className="relative">
          {showMoreMenu && (
            <div className="absolute bottom-16 left-0 w-64 glass-strong rounded-2xl shadow-soft-lg p-2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 text-sm font-medium transition cursor-pointer"
              >
                <span className="flex items-center gap-3 text-zinc-900 dark:text-white">
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  Переключить тему
                </span>
                <span className="text-xs text-zinc-400 capitalize">{theme}</span>
              </button>
              <Link
                href="/profile"
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition"
              >
                <User className="w-5 h-5" />
                Профиль
              </Link>
              <Link
                href="/settings"
                onClick={() => setShowMoreMenu(false)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition"
              >
                <Settings className="w-5 h-5" />
                Настройки
              </Link>
              <hr className="my-2 border-zinc-200 dark:border-zinc-800" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-650 dark:text-red-400 text-sm font-medium transition cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </div>
          )}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition duration-200 cursor-pointer text-left"
          >
            <Menu className="w-6 h-6" />
            <span className={`text-base hidden ${showSearchPanel || showNotifPanel ? "" : "xl:inline"} font-normal`}>Ещё</span>
          </button>
        </div>
      </aside>

      {/* ----------------- SEARCH SLIDE-OUT PANEL (DESKTOP) ----------------- */}
      {showSearchPanel && (
        <div className="hidden md:flex flex-col w-96 glass h-screen sticky top-0 z-30 p-6 animate-in slide-in-from-left duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Поиск</h2>
            <button
              onClick={() => {
                setShowSearchPanel(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer text-zinc-900 dark:text-zinc-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mb-6">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск"
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 outline-none rounded-lg px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <hr className="border-zinc-200 dark:border-zinc-800 mb-4" />
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {!searchQuery.trim() ? (
              /* ---- Recent searches ---- */
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Недавнее</span>
                  {searchHistory.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="text-xs font-bold text-blue-500 hover:text-blue-600 cursor-pointer"
                    >
                      Очистить всё
                    </button>
                  )}
                </div>

                {historyLoading ? (
                  <div className="flex flex-col gap-4 pt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        <div className="w-24 h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
                      </div>
                    ))}
                  </div>
                ) : searchHistory.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 select-none">
                    <span className="text-sm font-medium">Нет недавних запросов.</span>
                  </div>
                ) : (
                  searchHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-1.5">
                      <button
                        onClick={() => {
                          // A person jumps to their profile; a text entry re-runs the query.
                          if (item.userId) goToUser(item.userId);
                          else setSearchQuery(item.queryText);
                        }}
                        className="flex items-center gap-3 text-left cursor-pointer flex-1 min-w-0"
                      >
                        {item.userId ? (
                          <Avatar
                            src={item.avatar}
                            name={item.userName}
                            className="w-11 h-11 border border-zinc-200 dark:border-zinc-800"
                          />
                        ) : (
                          <span className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <Search className="w-5 h-5 text-zinc-500" />
                          </span>
                        )}
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.userId ? item.userName || "user" : item.queryText}
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeleteHistoryItem(item.id)}
                        title="Удалить из истории"
                        className="p-1.5 ml-2 flex-shrink-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-full cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : searchLoading ? (
              <div className="flex flex-col gap-4 pt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex flex-col gap-2">
                      <div className="w-24 h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
                      <div className="w-16 h-2.5 rounded bg-zinc-100 dark:bg-zinc-900" />
                    </div>
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 select-none">
                <span className="text-sm font-medium">Ничего не найдено.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {searchResults.map((user: any) => {
                  const uid = user.id || user.userId || "";
                  const uname = user.userName || user.username || "user";
                  const isCurrentlyFollowing = followingList.some((s: any) => s.id === uid || s.userName === uname);
                  const isSelf = currentUser?.id === uid;
                  return (
                    <div key={uid || uname} className="flex items-center justify-between py-1.5">
                      <button
                        onClick={() => goToUser(uid)}
                        className="flex items-center gap-3 text-left cursor-pointer flex-1 min-w-0"
                      >
                        <Avatar
                          src={getFullImageUrl(user.avatar || user.imagePath)}
                          name={uname}
                          className="w-11 h-11 border border-zinc-200 dark:border-zinc-800"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{uname}</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{user.fullName || user.name || ""}</span>
                        </div>
                      </button>
                      {!isSelf && (
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <button
                            onClick={() => handleMessageUser(uid)}
                            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold px-3 py-1.5 rounded-lg text-zinc-900 dark:text-zinc-100 transition cursor-pointer"
                          >
                            Написать
                          </button>
                          <button
                            onClick={() => handleFollowToggle(user)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                              isCurrentlyFollowing
                                ? "bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-650 dark:text-red-400 border border-zinc-200 dark:border-zinc-700"
                                : "bg-blue-500 hover:bg-blue-600 text-white"
                            }`}
                          >
                            {isCurrentlyFollowing ? "Подписки" : "Подписаться"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- NOTIFICATIONS PANEL ----------------- */}
      {showNotifPanel && <NotificationsPanel onClose={() => setShowNotifPanel(false)} />}

      {/* ----------------- MUSIC PICKER (reels) ----------------- */}
      {showMusicPicker && (
        <MusicPicker
          onSelect={(track) => setReelTrack(track)}
          onClose={() => setShowMusicPicker(false)}
        />
      )}

      {/* ----------------- MOBILE TOP BAR ----------------- */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 glass sticky top-0 z-40">
        <Link href="/" className="font-serif text-2xl font-bold tracking-wider italic bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent">
          Instagram
        </Link>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-1 text-zinc-700 dark:text-zinc-300 press">
            {theme === "dark" ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
          <button onClick={() => setShowNotifPanel(true)} className="relative p-1 text-zinc-700 dark:text-zinc-300 press">
            <Heart className="w-6 h-6" />
          </button>
          <Link href="/direct/inbox" className="relative p-1 text-zinc-700 dark:text-zinc-300 press">
            <Send className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* ----------------- MAIN CONTENT AREA ----------------- */}
      <main className="flex-1 min-w-0 flex flex-col relative pb-16 md:pb-0 overflow-y-auto">
        {children}
      </main>

      {/* ----------------- MOBILE BOTTOM NAV ----------------- */}
      <footer className="md:hidden flex items-center justify-around glass h-16 fixed bottom-3 left-3 right-3 z-40 rounded-3xl shadow-soft-lg">
        <Link href="/" className="p-2 text-zinc-700 dark:text-zinc-300">
          <Home className={`w-6 h-6 ${pathname === "/" ? "fill-black dark:fill-white" : ""}`} />
        </Link>
        <Link href="/explore" className="p-2 text-zinc-700 dark:text-zinc-300">
          <Compass className={`w-6 h-6 ${pathname === "/explore" ? "stroke-[3px]" : ""}`} />
        </Link>
        <Link href="/reels" className="p-2 text-zinc-700 dark:text-zinc-300">
          <Film className={`w-6 h-6 ${pathname === "/reels" ? "stroke-[3px]" : ""}`} />
        </Link>
        <button onClick={() => setCreateOpen(true)} className="p-2 text-zinc-700 dark:text-zinc-300">
          <PlusSquare className="w-6 h-6" />
        </button>
        <Link href="/profile" className="p-2">
          <Avatar
            src={userAvatar}
            name={currentUser?.username}
            alt="Profile"
            className={`w-6 h-6 border ${pathname === "/profile" ? "border-black dark:border-white ring-2 ring-zinc-200 dark:ring-zinc-800" : "border-transparent"}`}
          />
        </Link>
      </footer>

      {/* ----------------- CREATE POST MODAL ----------------- */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Close button outside */}
          <button
            onClick={resetCreateModal}
            className="absolute top-4 right-4 text-white hover:text-zinc-300"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Modal Container */}
          <div className="glass-strong w-full max-w-lg md:max-w-4xl rounded-3xl shadow-soft-lg flex flex-col overflow-hidden max-h-[85vh] transition-all duration-300 text-zinc-900 dark:text-white animate-pop-in">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setImageFile(null);
                }}
                className={`text-sm font-semibold hover:text-zinc-500 dark:hover:text-zinc-400 cursor-pointer ${selectedImage ? "visible" : "invisible"}`}
              >
                Назад
              </button>
              
              {!selectedImage ? (
                <div className="flex items-center gap-6 justify-center flex-1">
                  {(["post", "reel", "story"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setCreateType(type)}
                      className={`text-sm font-bold pb-1 border-b-2 transition capitalize cursor-pointer ${
                        createType === type
                          ? "border-black dark:border-white text-black dark:text-white"
                          : "border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300"
                      }`}
                    >
                      {type === "post" ? "Публикация" : type === "reel" ? "Reels" : "История"}
                    </button>
                  ))}
                </div>
              ) : (
                <h2 className="font-semibold text-base text-center flex-1">
                  {createType === "post" ? "Создание публикации" : createType === "reel" ? "Создание Reels" : "Создание истории"}
                </h2>
              )}
              
              {selectedImage ? (
                <button
                  onClick={handleShare}
                  disabled={isUploading || uploadSuccess}
                  className="text-sm font-semibold text-blue-500 hover:text-blue-650 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? "Делимся..." : uploadSuccess ? "Поделено" : "Поделиться"}
                </button>
              ) : (
                <div className="w-8" />
              )}
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col md:flex-row min-h-[350px] md:min-h-[500px]">
              
              {/* Left Pane - Selector or Image/Video Preview */}
              <div
                className={`flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 relative ${
                  !selectedImage ? "border-dashed border-2 border-zinc-300 dark:border-zinc-800 m-4 rounded-xl" : ""
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {selectedImage ? (
                  imageFile?.type.startsWith("video/") ? (
                    <video
                      src={selectedImage}
                      controls
                      autoPlay
                      loop
                      muted
                      className="w-full h-full max-h-[50vh] md:max-h-[70vh] object-contain"
                    />
                  ) : (
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="w-full h-full max-h-[50vh] md:max-h-[70vh] object-contain"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center text-center">
                    {createType === "reel" ? (
                      <Film className="w-16 h-16 text-zinc-400 dark:text-zinc-650 mb-4 stroke-[1.2px]" />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-zinc-400 dark:text-zinc-650 mb-4 stroke-[1.2px]" />
                    )}
                    <p className="text-lg font-normal mb-6 text-zinc-800 dark:text-zinc-200">
                      {createType === "story"
                        ? "Перетащите сюда фото для истории"
                        : createType === "reel"
                          ? "Перетащите сюда видео (.mp4)"
                          : "Перетащите сюда фото и видео"}
                    </p>
                    <label className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg cursor-pointer transition">
                      Выбрать на компьютере
                      <input
                        type="file"
                        accept={
                          createType === "story"
                            ? "image/*"
                            : createType === "reel"
                              ? "video/mp4,video/*"
                              : "image/*,video/*"
                        }
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Right Pane - Form Details (shown once media is selected) */}
              {selectedImage && (
                <div className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-4 text-left overflow-y-auto">
                  {/* User row */}
                  <div className="flex items-center gap-3">
                    <Avatar src={userAvatar} name={currentUser?.username} className="w-7 h-7 border" />
                    <span className="font-semibold text-sm">{currentUser?.username}</span>
                  </div>

                  {createType === "story" ? (
                    <>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Аудитория</span>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setIsForCloseFriends(false)}
                          className={`flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer ${
                            !isForCloseFriends ? "btn-grad text-white" : "glass hover:shadow-soft"
                          }`}
                        >
                          <Globe className="w-5 h-5 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">Поделиться со всеми</span>
                            <span className={`text-[11px] ${!isForCloseFriends ? "text-white/80" : "text-zinc-450"}`}>
                              Обычная история
                            </span>
                          </div>
                        </button>
                        <button
                          onClick={() => setIsForCloseFriends(true)}
                          className={`flex items-center gap-3 p-3 rounded-2xl text-left transition cursor-pointer ${
                            isForCloseFriends
                              ? "bg-green-500 text-white"
                              : "glass hover:shadow-soft"
                          }`}
                        >
                          <Star className={`w-5 h-5 flex-shrink-0 ${isForCloseFriends ? "fill-white" : "fill-green-500 text-green-500"}`} />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">Для близких друзей</span>
                            <span className={`text-[11px] ${isForCloseFriends ? "text-white/80" : "text-zinc-450"}`}>
                              Видно только вашему списку
                            </span>
                          </div>
                        </button>
                      </div>

                      <hr className="border-zinc-200 dark:border-zinc-800 my-1" />

                      {/* ---- Interactive sticker ---- */}
                      <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                        Добавить стикер
                      </span>
                      <div className="flex gap-2">
                        {([
                          { kind: "NONE", label: "Без стикера" },
                          { kind: "POLL", label: "Опрос" },
                          { kind: "QUESTION", label: "Вопрос" },
                        ] as const).map(({ kind, label }) => (
                          <button
                            key={kind}
                            onClick={() => setStickerKind(kind)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                              stickerKind === kind ? "btn-grad text-white" : "glass hover:shadow-soft"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {stickerKind !== "NONE" && (
                        <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                          <input
                            type="text"
                            value={stickerQuestion}
                            onChange={(e) => setStickerQuestion(e.target.value)}
                            placeholder={
                              stickerKind === "POLL" ? "Вопрос опроса..." : "Например: Задай мне вопрос"
                            }
                            className="w-full glass rounded-xl px-3 py-2.5 text-sm outline-none text-zinc-900 dark:text-white"
                          />

                          {stickerKind === "POLL" && (
                            <div className="flex gap-2">
                              {[0, 1].map((i) => (
                                <input
                                  key={i}
                                  type="text"
                                  value={pollOptions[i]}
                                  onChange={(e) =>
                                    setPollOptions((prev) => {
                                      const next: [string, string] = [prev[0], prev[1]];
                                      next[i] = e.target.value;
                                      return next;
                                    })
                                  }
                                  placeholder={i === 0 ? "Вариант 1" : "Вариант 2"}
                                  className="flex-1 min-w-0 glass rounded-xl px-3 py-2.5 text-sm outline-none text-zinc-900 dark:text-white"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <hr className="border-zinc-200 dark:border-zinc-800 my-1" />

                      <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5" /> Аудио-дорожка
                      </span>

                      {reelTrack ? (
                        <div className="flex items-center gap-3 glass rounded-2xl p-2">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                            {reelTrack.coverUrl ? (
                              <img src={reelTrack.coverUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-4 h-4 text-zinc-500" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-semibold truncate">{reelTrack.title}</span>
                            <span className="text-[10px] text-zinc-450 truncate">{reelTrack.artist}</span>
                          </div>
                          <button
                            onClick={() => setShowMusicPicker(true)}
                            className="text-[11px] font-bold text-blue-500 hover:text-blue-600 cursor-pointer flex-shrink-0"
                          >
                            Заменить
                          </button>
                          <button
                            onClick={() => setReelTrack(null)}
                            title="Убрать музыку"
                            className="p-1 hover:text-red-500 cursor-pointer flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowMusicPicker(true)}
                          className="flex items-center justify-center gap-2 glass rounded-2xl py-2.5 text-sm font-semibold hover:shadow-soft cursor-pointer"
                        >
                          <Search className="w-4 h-4" /> Выбрать музыку
                        </button>
                      )}

                      {/* Audio Duration Selector */}
                      {reelTrack && (
                        <div className="flex flex-col gap-2 mt-2 p-3 glass rounded-2xl animate-fade-in">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-zinc-500">Длительность музыки:</span>
                            <span className="text-blue-500 font-bold">{storyMusicDuration} сек.</span>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={45}
                            step={1}
                            value={storyMusicDuration}
                            onChange={(e) => setStoryMusicDuration(Number(e.target.value))}
                            className="w-full accent-blue-500 cursor-pointer h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none"
                          />
                          <span className="text-[10px] text-zinc-400">Выберите время звучания истории (от 5 до 45 секунд)</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Caption input */}
                      <textarea
                        rows={4}
                        placeholder="Добавьте подпись..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full bg-transparent text-sm resize-none outline-none border-none ring-0 p-0 text-zinc-900 dark:text-white"
                      />

                      <hr className="border-zinc-200 dark:border-zinc-800" />

                      {createType === "reel" ? (
                        <>
                          <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5" /> Аудио-дорожка
                          </span>

                          {reelTrack ? (
                            <div className="flex items-center gap-3 glass rounded-2xl p-2">
                              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                                {reelTrack.coverUrl ? (
                                  <img src={reelTrack.coverUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Music className="w-4 h-4 text-zinc-500" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs font-semibold truncate">{reelTrack.title}</span>
                                <span className="text-[10px] text-zinc-450 truncate">{reelTrack.artist}</span>
                              </div>
                              <button
                                onClick={() => setShowMusicPicker(true)}
                                className="text-[11px] font-bold text-blue-500 hover:text-blue-600 cursor-pointer flex-shrink-0"
                              >
                                Заменить
                              </button>
                              <button
                                onClick={() => setReelTrack(null)}
                                title="Убрать музыку"
                                className="p-1 hover:text-red-500 cursor-pointer flex-shrink-0"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowMusicPicker(true)}
                              className="flex items-center justify-center gap-2 glass rounded-2xl py-2.5 text-sm font-semibold hover:shadow-soft cursor-pointer"
                            >
                              <Search className="w-4 h-4" /> Выбрать музыку
                            </button>
                          )}

                          <span className="text-[11px] text-zinc-450">
                            Без выбранной дорожки Reels использует оригинальный звук видео.
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-sm text-zinc-500">
                            <span className="font-medium text-zinc-900 dark:text-zinc-200">Добавить местоположение</span>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <hr className="border-zinc-200 dark:border-zinc-800" />
                        </>
                      )}
                    </>
                  )}

                  {uploadError && (
                    <span className="text-xs font-semibold text-red-500">{uploadError}</span>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
