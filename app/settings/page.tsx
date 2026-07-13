"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import { User, Sun, Moon, LogOut, Shield, Bell, HelpCircle } from "lucide-react";

export default function SettingsPage() {
  const { currentUser, theme, toggleTheme, setIsLoggedIn } = useApp();
  const router = useRouter();
  
  // Local form states
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [website, setWebsite] = useState("github.com/saidov10");
  const [bio, setBio] = useState("Frontend Developer & UI Designer. Crafting premium web layouts.");
  const [email, setEmail] = useState("mardin.saidov@example.com");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/login");
  };

  return (
    <div className="w-full max-w-[935px] mx-auto px-4 py-8 flex flex-col md:flex-row gap-8 select-none text-zinc-900 dark:text-zinc-100 min-h-[80vh]">
      
      {/* ----------------- SIDE MENU ----------------- */}
      <div className="w-full md:w-64 flex flex-row md:flex-col border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto no-scrollbar pb-4 md:pb-0 md:pr-4">
        <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 font-semibold text-sm text-left flex-shrink-0 cursor-pointer">
          <User className="w-5 h-5 stroke-[1.8px]" />
          <span>Редактировать профиль</span>
        </button>
        <button onClick={toggleTheme} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm text-left flex-shrink-0 cursor-pointer text-zinc-550 dark:text-zinc-400">
          {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          <span>Сменить тему ({theme === "dark" ? "Светлая" : "Темная"})</span>
        </button>
        <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm text-left flex-shrink-0 cursor-pointer text-zinc-550 dark:text-zinc-400">
          <Shield className="w-5 h-5" />
          <span>Конфиденциальность</span>
        </button>
        <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm text-left flex-shrink-0 cursor-pointer text-zinc-550 dark:text-zinc-400">
          <Bell className="w-5 h-5" />
          <span>Уведомления</span>
        </button>
        <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm text-left flex-shrink-0 cursor-pointer text-zinc-550 dark:text-zinc-400">
          <HelpCircle className="w-5 h-5" />
          <span>Справка</span>
        </button>
        <hr className="hidden md:block border-zinc-200 dark:border-zinc-800 my-2" />
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 text-sm text-left flex-shrink-0 cursor-pointer font-medium">
          <LogOut className="w-5 h-5" />
          <span>Выйти из аккаунта</span>
        </button>
      </div>

      {/* ----------------- FORM WORKSPACE ----------------- */}
      <div className="flex-1 md:pl-10">
        <h2 className="text-xl font-bold mb-8">Редактировать профиль</h2>
        
        <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-lg">
          
          {/* Picture preview change */}
          <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-150 dark:border-zinc-850">
            <img
              src={currentUser.avatar}
              alt={currentUser.username}
              className="w-14 h-14 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
            />
            <div className="flex flex-col">
              <span className="font-bold text-sm">{currentUser.username}</span>
              <button type="button" className="text-blue-500 hover:text-blue-600 text-xs font-bold text-left cursor-pointer">
                Изменить фото профиля
              </button>
            </div>
          </div>

          {/* Full Name input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-450 dark:text-zinc-500">Имя</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-850 focus:border-zinc-450 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          {/* Username input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-450 dark:text-zinc-500">Имя пользователя</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-850 focus:border-zinc-450 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          {/* Website input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-450 dark:text-zinc-500">Сайт</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-850 focus:border-zinc-450 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          {/* Bio input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-450 dark:text-zinc-500">О себе</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-850 focus:border-zinc-450 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm resize-none text-white"
            />
          </div>

          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-450 dark:text-zinc-500">Электронная почта</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-850 focus:border-zinc-450 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          {/* Save button and status */}
          <div className="flex items-center gap-4 mt-2">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition cursor-pointer"
            >
              Отправить
            </button>
            {saved && (
              <span className="text-sm font-semibold text-green-500 animate-in fade-in duration-200">
                Настройки успешно сохранены
              </span>
            )}
          </div>

        </form>
      </div>

    </div>
  );
}
