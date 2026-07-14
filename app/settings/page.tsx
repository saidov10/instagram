"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { logout, updateProfile, updateAvatar, fetchMyProfile } from "../store/slices/authSlice";
import { AppDispatch, RootState } from "../store/store";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";
import { User, Sun, Moon, LogOut, Shield, Bell, HelpCircle, Lock } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { theme, toggleTheme } = useApp();
  const { currentUser } = useSelector((state: RootState) => state.auth);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Local form states
  const [name, setName] = useState(currentUser?.name || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [bio, setBio] = useState(currentUser?.about || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Change-password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword.length < 6) {
      setPwMessage({ type: "err", text: "Пароль должен быть не короче 6 символов." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "err", text: "Пароли не совпадают." });
      return;
    }
    setPwLoading(true);
    try {
      await api.account.changePassword({
        OldPassword: oldPassword,
        Password: newPassword,
        ConfirmPassword: confirmPassword,
      });
      setPwMessage({ type: "ok", text: "Пароль успешно изменён." });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwMessage({ type: "err", text: err?.message || "Не удалось изменить пароль." });
    } finally {
      setPwLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateProfile({ about: bio })).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setSaving(true);
        await dispatch(updateAvatar(file)).unwrap();
        // Reload profile to get new image URL
        await dispatch(fetchMyProfile()).unwrap();
      } catch (err) {
        console.error(err);
      } finally {
        setSaving(false);
      }
    }
  };

  if (!currentUser) return null;

  return (
    <div className="w-full max-w-[935px] mx-auto px-4 py-8 flex flex-col md:flex-row gap-8 select-none text-zinc-900 dark:text-zinc-100 min-h-[80vh] transition-colors duration-200 animate-fade-up">
      
      {/* ----------------- SIDE MENU ----------------- */}
      <div className="w-full md:w-64 flex flex-row md:flex-col border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 gap-1 overflow-x-auto no-scrollbar pb-4 md:pb-0 md:pr-4">
        <button className="flex items-center gap-3 px-4 py-3 rounded-xl glass font-semibold text-sm text-left flex-shrink-0 cursor-pointer">
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
      <div className="flex-1 md:pl-10 text-left">
        <h2 className="text-xl font-bold mb-8">Редактировать профиль</h2>
        
        <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-lg">
          
          {/* Picture preview change */}
          <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-150 dark:border-zinc-800">
            <img
              src={currentUser.avatar}
              alt={currentUser.username}
              className="w-14 h-14 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
            />
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm">{currentUser.username}</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-650 text-xs font-bold text-left cursor-pointer mt-1"
              >
                Изменить фото профиля
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* Full Name input (Read only or visual) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">Имя</label>
            <input
              type="text"
              value={name}
              disabled
              className="bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 outline-none rounded-lg px-3 py-2 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>

          {/* Username input (Read only or visual) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">Имя пользователя</label>
            <input
              type="text"
              value={username}
              disabled
              className="bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 outline-none rounded-lg px-3 py-2 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>

          {/* Bio input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-450 dark:text-zinc-500">О себе</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-450 dark:focus:border-zinc-650 outline-none rounded-lg px-3 py-2 text-sm resize-none text-zinc-900 dark:text-white"
            />
          </div>

          {/* Save button and status */}
          <div className="flex items-center gap-4 mt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition cursor-pointer"
            >
              {saving ? "Сохранение..." : "Отправить"}
            </button>
            {saved && (
              <span className="text-sm font-semibold text-green-500 animate-in fade-in duration-200">
                Настройки успешно сохранены
              </span>
            )}
          </div>

        </form>

        {/* ----------------- CHANGE PASSWORD ----------------- */}
        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 max-w-lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5" /> Сменить пароль
          </h3>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-zinc-450 dark:text-zinc-500">Текущий пароль</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-450 dark:focus:border-zinc-650 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-zinc-450 dark:text-zinc-500">Новый пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-450 dark:focus:border-zinc-650 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-zinc-450 dark:text-zinc-500">Подтвердите новый пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-450 dark:focus:border-zinc-650 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-4 mt-2">
              <button
                type="submit"
                disabled={pwLoading || !oldPassword || !newPassword || !confirmPassword}
                className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition cursor-pointer"
              >
                {pwLoading ? "Сохранение..." : "Сменить пароль"}
              </button>
              {pwMessage && (
                <span className={`text-sm font-semibold animate-in fade-in duration-200 ${pwMessage.type === "ok" ? "text-green-500" : "text-red-500"}`}>
                  {pwMessage.text}
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
