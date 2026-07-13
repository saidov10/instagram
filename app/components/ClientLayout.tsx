"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "../context/AppContext";
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

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const {
    theme,
    toggleTheme,
    isCreateOpen,
    setCreateOpen,
    isLoggedIn,
    setIsLoggedIn,
    currentUser,
    addPost
  } = useApp();
  
  const pathname = usePathname();
  const router = useRouter();

  // Create modal internal states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // More dropdown menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Search overlay (for desktop sidebar)
  const [showSearchPanel, setShowSearchPanel] = useState(false);

  // Redirect to login if not logged in (and not already on login page)
  React.useEffect(() => {
    if (!isLoggedIn && pathname !== "/login") {
      router.push("/login");
    }
  }, [isLoggedIn, pathname, router]);

  // If on login page, just show content without sidebar/navs
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Handle mock image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setSelectedImage(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = () => {
    if (!selectedImage) return;
    setIsUploading(true);
    setTimeout(() => {
      addPost(selectedImage, caption);
      setIsUploading(false);
      setUploadSuccess(true);
      setTimeout(() => {
        // Reset states and close
        setCreateOpen(false);
        setSelectedImage(null);
        setCaption("");
        setUploadSuccess(false);
        router.push("/profile");
      }, 1500);
    }, 2000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
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
                          src={currentUser.avatar}
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
                          src={currentUser.avatar}
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
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-medium transition cursor-pointer"
              >
                <span className="flex items-center gap-3">
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
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium transition cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </div>
          )}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition duration-200 cursor-pointer"
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
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
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
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">2</span>
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
            src={currentUser.avatar}
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
              setCaption("");
            }}
            className="absolute top-4 right-4 text-white hover:text-zinc-300"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Modal Container */}
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg md:max-w-4xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] transition-all duration-300 border border-zinc-200 dark:border-zinc-800">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setSelectedImage(null)}
                className={`text-sm font-semibold hover:text-zinc-500 dark:hover:text-zinc-400 cursor-pointer ${selectedImage ? "visible" : "invisible"}`}
              >
                Назад
              </button>
              <h2 className="font-semibold text-base text-center flex-1">Создание публикации</h2>
              {selectedImage ? (
                <button
                  onClick={handleShare}
                  disabled={isUploading || uploadSuccess}
                  className="text-sm font-semibold text-blue-500 hover:text-blue-600 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? "Делимся..." : uploadSuccess ? "Поделено" : "Поделиться"}
                </button>
              ) : (
                <div className="w-8" />
              )}
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col md:flex-row min-h-[350px] md:min-h-[500px]">
              
              {/* Left Pane - Selector or Image Preview */}
              <div
                className={`flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 relative ${
                  !selectedImage ? "border-dashed border-2 border-zinc-300 dark:border-zinc-800 m-4 rounded-xl" : ""
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full h-full max-h-[50vh] md:max-h-[70vh] object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <ImageIcon className="w-16 h-16 text-zinc-400 dark:text-zinc-600 mb-4 stroke-[1.2px]" />
                    <p className="text-lg font-normal mb-6 text-zinc-800 dark:text-zinc-200">Перетащите сюда фото и видео</p>
                    <label className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg cursor-pointer transition">
                      Выбрать на компьютере
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Upload Status Overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-base font-semibold">Делимся вашей публикацией...</p>
                  </div>
                )}

                {/* Upload Success Overlay */}
                {uploadSuccess && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white animate-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold">Ваша публикация добавлена.</p>
                  </div>
                )}
              </div>

              {/* Right Pane - Caption & Details (Visible only when image is selected) */}
              {selectedImage && (
                <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between">
                  <div>
                    {/* User profile */}
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="font-semibold text-sm">{currentUser.username}</span>
                    </div>

                    {/* Caption input */}
                    <textarea
                      placeholder="Добавьте подпись..."
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      maxLength={2200}
                      rows={5}
                      className="w-full resize-none bg-transparent text-sm border-0 outline-none focus:ring-0 placeholder-zinc-400"
                    />

                    {/* Character limit & emojis */}
                    <div className="flex justify-between items-center text-zinc-400 text-xs border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-3">
                      <button type="button" className="hover:text-zinc-650 dark:hover:text-zinc-200 cursor-pointer">
                        <Smile className="w-5 h-5" />
                      </button>
                      <span>{caption.length}/2,200</span>
                    </div>

                    {/* Mock location selector */}
                    <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer">
                      <span className="text-zinc-550 dark:text-zinc-400">Добавить местоположение</span>
                      <MapPin className="w-5 h-5 text-zinc-400" />
                    </div>

                    {/* Accessibility & Advanced settings accordion */}
                    <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer">
                      <span className="text-zinc-550 dark:text-zinc-400">Специальные возможности</span>
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
