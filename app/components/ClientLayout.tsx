"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useApp } from "../context/AppContext";
import { logout, initializeToken, fetchMyProfile } from "../store/slices/authSlice";
import { createPost } from "../store/slices/postsSlice";
import { createStory } from "../store/slices/storiesSlice";
import { AppDispatch, RootState } from "../store/store";
import { getStoredToken } from "../services/api";
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
  Bookmark
} from "lucide-react";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop";

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
  
  // More dropdown menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Search overlay (for desktop sidebar)
  const [showSearchPanel, setShowSearchPanel] = useState(false);

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

  // Routes reachable without being logged in — they render without sidebar/navs.
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/accounts/emailsignup" ||
    pathname.startsWith("/accounts/password/reset");

  // Redirect to login if not logged in
  React.useEffect(() => {
    if (isInitialized && !isLoggedIn && !isPublicRoute) {
      router.push("/login");
    }
  }, [isInitialized, isLoggedIn, isPublicRoute, router]);

  if (isPublicRoute) {
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

  const handleShare = async () => {
    if (!imageFile) return;
    setIsUploading(true);
    try {
      if (createType === "story") {
        await dispatch(createStory({ file: imageFile })).unwrap();
      } else if (createType === "reel") {
        await dispatch(createPost({
          title: caption || "Instagram Reel",
          content: caption,
          images: [imageFile],
          isReel: true
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
      setTimeout(() => {
        // Reset states and close
        setCreateOpen(false);
        setSelectedImage(null);
        setImageFile(null);
        setCaption("");
        setUploadSuccess(false);
        
        // Redirect to target path
        const targetPath = createType === "reel" ? "/reels" : (createType === "story" ? "/" : "/profile");
        router.push(targetPath);
      }, 1500);
    } catch (err) {
      console.error(err);
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
    { label: "Уведомления", href: "#", icon: Heart },
    { label: "Создать", href: "#", icon: PlusSquare, onClick: () => setCreateOpen(true) },
    { label: "Профиль", href: "/profile", icon: User }
  ];

  const userAvatar = currentUser?.avatar || DEFAULT_AVATAR;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      
      {/* ----------------- DESKTOP & TABLET SIDEBAR ----------------- */}
      <aside className={`hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black h-screen sticky top-0 z-40 transition-all duration-300 ${showSearchPanel ? "w-[72px]" : "w-[72px] xl:w-64"} p-3 justify-between`}>
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link href="/" className="h-14 flex items-center px-3 mt-4">
            {showSearchPanel ? (
              <svg className="w-7 h-7 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            ) : (
              <span className="hidden xl:inline font-serif text-2xl font-bold tracking-wider italic bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent">Instagram</span>
            )}
            <span className="xl:hidden">
              <svg className="w-7 h-7 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </span>
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
                      className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition duration-200 text-left cursor-pointer"
                    >
                      {item.label === "Профиль" ? (
                        <img
                          src={userAvatar}
                          alt="Profile"
                          className={`w-6 h-6 rounded-full border ${
                            isActive ? "border-black dark:border-white ring-2 ring-zinc-200 dark:ring-zinc-800" : "border-zinc-300 dark:border-zinc-700"
                          } object-cover`}
                        />
                      ) : (
                        <Icon className={`w-6 h-6 ${isActive ? "stroke-[3px]" : "stroke-[2px]"}`} />
                      )}
                      <span className={`text-base hidden ${showSearchPanel ? "" : "xl:inline"} ${isActive ? "font-bold" : "font-normal"}`}>
                        {item.label}
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition duration-200"
                    >
                      {item.label === "Профиль" ? (
                        <img
                          src={userAvatar}
                          alt="Profile"
                          className={`w-6 h-6 rounded-full border ${
                            isActive ? "border-black dark:border-white ring-2 ring-zinc-200 dark:ring-zinc-800" : "border-zinc-300 dark:border-zinc-700"
                          } object-cover`}
                        />
                      ) : (
                        <Icon className={`w-6 h-6 ${isActive ? "stroke-[3px]" : "stroke-[2px]"}`} />
                      )}
                      <span className={`text-base hidden ${showSearchPanel ? "" : "xl:inline"} ${isActive ? "font-bold" : "font-normal"}`}>
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
            <div className="absolute bottom-16 left-0 w-64 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
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
            <span className={`text-base hidden ${showSearchPanel ? "" : "xl:inline"} font-normal`}>Ещё</span>
          </button>
        </div>
      </aside>

      {/* ----------------- SEARCH SLIDE-OUT PANEL (DESKTOP) ----------------- */}
      {showSearchPanel && (
        <div className="hidden md:flex flex-col w-96 bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 h-screen sticky top-0 z-30 p-6 animate-in slide-in-from-left duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Поиск</h2>
            <button onClick={() => setShowSearchPanel(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Поиск"
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 outline-none rounded-lg px-4 py-2.5 text-sm"
            />
          </div>
          <hr className="border-zinc-200 dark:border-zinc-800 mb-4" />
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-650">
            <span className="text-sm font-medium">Нет недавних запросов.</span>
          </div>
        </div>
      )}

      {/* ----------------- MOBILE TOP BAR ----------------- */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-black z-40">
        <Link href="/" className="font-serif text-2xl font-bold tracking-wider italic bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent">
          Instagram
        </Link>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-1 text-zinc-700 dark:text-zinc-300">
            {theme === "dark" ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
          <Link href="/direct/inbox" className="relative p-1 text-zinc-700 dark:text-zinc-300">
            <Send className="w-6 h-6" />
          </Link>
        </div>
      </header>

      {/* ----------------- MAIN CONTENT AREA ----------------- */}
      <main className="flex-1 min-w-0 flex flex-col relative pb-16 md:pb-0 overflow-y-auto">
        {children}
      </main>

      {/* ----------------- MOBILE BOTTOM NAV ----------------- */}
      <footer className="md:hidden flex items-center justify-around border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black h-16 fixed bottom-0 left-0 right-0 z-40">
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
          <img
            src={userAvatar}
            alt="Profile"
            className={`w-6 h-6 rounded-full object-cover border ${pathname === "/profile" ? "border-black dark:border-white ring-2 ring-zinc-200 dark:ring-zinc-800" : "border-transparent"}`}
          />
        </Link>
      </footer>

      {/* ----------------- CREATE POST MODAL ----------------- */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Close button outside */}
          <button
            onClick={() => {
              setCreateOpen(false);
              setSelectedImage(null);
              setImageFile(null);
              setCaption("");
            }}
            className="absolute top-4 right-4 text-white hover:text-zinc-300"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Modal Container */}
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg md:max-w-4xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] transition-all duration-300 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white">
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
                    <ImageIcon className="w-16 h-16 text-zinc-400 dark:text-zinc-650 mb-4 stroke-[1.2px]" />
                    <p className="text-lg font-normal mb-6 text-zinc-800 dark:text-zinc-200">
                      {createType === "story" ? "Перетащите сюда фото для истории" : "Перетащите сюда фото и видео"}
                    </p>
                    <label className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg cursor-pointer transition">
                      Выбрать на компьютере
                      <input
                        type="file"
                        accept={createType === "story" ? "image/*" : "image/*,video/*"}
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Right Pane - Form Details (Only visible when image selected and not a story) */}
              {selectedImage && createType !== "story" && (
                <div className="w-full md:w-[340px] border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-4 text-left">
                  {/* User row */}
                  <div className="flex items-center gap-3">
                    <img
                      src={userAvatar}
                      alt={currentUser?.username}
                      className="w-7 h-7 rounded-full object-cover border"
                    />
                    <span className="font-semibold text-sm">{currentUser?.username}</span>
                  </div>

                  {/* Caption input */}
                  <textarea
                    rows={4}
                    placeholder="Добавьте подпись..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full bg-transparent text-sm resize-none outline-none border-none ring-0 p-0 text-zinc-900 dark:text-white"
                  />

                  <hr className="border-zinc-200 dark:border-zinc-800" />

                  {/* Mock actions inside form */}
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">Добавить местоположение</span>
                    <MapPin className="w-4 h-4" />
                  </div>

                  <hr className="border-zinc-200 dark:border-zinc-800" />
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
