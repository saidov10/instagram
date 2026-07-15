"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { logout, updateProfile, updateAvatar, fetchMyProfile, updatePrivacy } from "../store/slices/authSlice";
import { AppDispatch, RootState } from "../store/store";
import { useApp } from "../context/AppContext";
import { api, getFullImageUrl } from "../services/api";
import { User, Sun, Moon, LogOut, Shield, Bell, HelpCircle, Lock, Ban, EyeOff, Star, Search, Monitor, Smartphone } from "lucide-react";
import Avatar from "../components/Avatar";

interface DeviceSession {
  id: string;
  ip: string;
  device: string;
  isMobile: boolean;
  loggedInAt: string;
  isCurrent: boolean;
}

/** Turn a raw user-agent into something a human can recognise. */
const describeDevice = (ua: string): { label: string; isMobile: boolean } => {
  if (!ua) return { label: "Неизвестное устройство", isMobile: false };
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const browser =
    /Edg/i.test(ua) ? "Edge" :
    /OPR|Opera/i.test(ua) ? "Opera" :
    /Chrome/i.test(ua) ? "Chrome" :
    /Firefox/i.test(ua) ? "Firefox" :
    /Safari/i.test(ua) ? "Safari" : null;
  const os =
    /Windows/i.test(ua) ? "Windows" :
    /Android/i.test(ua) ? "Android" :
    /iPhone|iPad|iOS/i.test(ua) ? "iOS" :
    /Mac OS/i.test(ua) ? "macOS" :
    /Linux/i.test(ua) ? "Linux" : null;

  const label = [browser, os].filter(Boolean).join(" · ");
  return { label: label || ua.slice(0, 40), isMobile };
};

const mapSession = (s: any): DeviceSession => {
  const ua = s.userAgent || s.device || s.deviceInfo || s.browser || "";
  const { label, isMobile } = describeDevice(ua);
  return {
    id: String(s.id ?? s.sessionId ?? ""),
    ip: s.ipAddress || s.ip || "—",
    device: s.deviceName || label,
    isMobile,
    loggedInAt: s.createdAt || s.loginAt || s.loggedInAt || s.lastActiveAt || "",
    isCurrent: !!(s.isCurrent ?? s.isCurrentSession ?? s.current),
  };
};

const formatSessionDate = (iso: string): string => {
  if (!iso) return "Дата неизвестна";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Дата неизвестна";
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

  // Section navigation + privacy panel state
  const [activeSection, setActiveSection] = useState<"profile" | "privacy" | "closeFriends" | "sessions">("profile");
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [hiddenUsers, setHiddenUsers] = useState<any[]>([]);

  // Login activity / device sessions
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState<Record<string, boolean>>({});

  // Close friends
  const [closeFriends, setCloseFriends] = useState<any[]>([]);
  const [cfLoading, setCfLoading] = useState(false);
  const [cfSearch, setCfSearch] = useState("");
  const [cfResults, setCfResults] = useState<any[]>([]);
  const [cfSearching, setCfSearching] = useState(false);
  const [cfBusy, setCfBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeSection !== "privacy") return;
    api.user.getBlockedUsers()
      .then((list) => setBlockedUsers(list || []))
      .catch(() => setBlockedUsers([]));
    api.story.getHiddenUsers()
      .then((list) => setHiddenUsers(list || []))
      .catch(() => setHiddenUsers([]));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "closeFriends") return;
    setCfLoading(true);
    api.user.getCloseFriends()
      .then((list) => setCloseFriends(list || []))
      .catch(() => setCloseFriends([]))
      .finally(() => setCfLoading(false));
  }, [activeSection]);

  // Debounced user search for adding close friends
  useEffect(() => {
    if (activeSection !== "closeFriends") return;
    const q = cfSearch.trim();
    if (!q) {
      setCfResults([]);
      setCfSearching(false);
      return;
    }
    setCfSearching(true);
    const t = setTimeout(async () => {
      try {
        const users = await api.user.getUsers({ userName: q });
        setCfResults(users || []);
      } catch {
        setCfResults([]);
      } finally {
        setCfSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [cfSearch, activeSection]);

  useEffect(() => {
    if (activeSection !== "sessions") return;
    setSessionsLoading(true);
    setSessionsError(null);
    api.account.getActiveSessions()
      .then((list) => setSessions((list || []).map(mapSession)))
      .catch((err) => {
        setSessions([]);
        setSessionsError(err?.message || "Не удалось загрузить список сеансов.");
      })
      .finally(() => setSessionsLoading(false));
  }, [activeSection]);

  const handleLogoutSession = async (sessionId: string) => {
    if (sessionBusy[sessionId]) return;
    if (!window.confirm("Завершить сеанс на этом устройстве?")) return;
    setSessionBusy((b) => ({ ...b, [sessionId]: true }));
    try {
      await api.account.logoutSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error("Failed to end session:", err);
    } finally {
      setSessionBusy((b) => ({ ...b, [sessionId]: false }));
    }
  };

  const handleAddCloseFriend = async (user: any) => {
    const uid = user.id || user.userId;
    if (!uid || cfBusy[uid]) return;
    setCfBusy((b) => ({ ...b, [uid]: true }));
    try {
      await api.user.addCloseFriends([uid]);
      setCloseFriends((prev) => (prev.some((f) => (f.id || f.userId) === uid) ? prev : [...prev, user]));
      setCfSearch("");
      setCfResults([]);
    } catch (err) {
      console.error("Failed to add close friend:", err);
    } finally {
      setCfBusy((b) => ({ ...b, [uid]: false }));
    }
  };

  const handleRemoveCloseFriend = async (userId: string) => {
    if (cfBusy[userId]) return;
    setCfBusy((b) => ({ ...b, [userId]: true }));
    const snapshot = closeFriends;
    setCloseFriends((prev) => prev.filter((f) => (f.id || f.userId) !== userId));
    try {
      await api.user.deleteCloseFriend(userId);
    } catch (err) {
      console.error("Failed to remove close friend:", err);
      setCloseFriends(snapshot);
    } finally {
      setCfBusy((b) => ({ ...b, [userId]: false }));
    }
  };

  const handleTogglePrivate = async () => {
    if (!currentUser || privacyBusy) return;
    setPrivacyBusy(true);
    try {
      await dispatch(updatePrivacy(!currentUser.isPrivate)).unwrap();
    } catch (err) {
      console.error(err);
    } finally {
      setPrivacyBusy(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await api.user.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => (u.id || u.userId) !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnhide = async (userId: string) => {
    try {
      await api.story.unhideStoryFrom(userId);
      setHiddenUsers((prev) => prev.filter((u) => (u.id || u.userId) !== userId));
    } catch (err) {
      console.error(err);
    }
  };

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
        <button
          onClick={() => setActiveSection("profile")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm text-left flex-shrink-0 cursor-pointer ${
            activeSection === "profile" ? "glass" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-550 dark:text-zinc-400 font-normal"
          }`}
        >
          <User className="w-5 h-5 stroke-[1.8px]" />
          <span>Редактировать профиль</span>
        </button>
        <button onClick={toggleTheme} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm text-left flex-shrink-0 cursor-pointer text-zinc-550 dark:text-zinc-400">
          {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          <span>Сменить тему ({theme === "dark" ? "Светлая" : "Темная"})</span>
        </button>
        <button
          onClick={() => setActiveSection("privacy")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left flex-shrink-0 cursor-pointer ${
            activeSection === "privacy" ? "glass font-semibold" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-550 dark:text-zinc-400"
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>Конфиденциальность</span>
        </button>
        <button
          onClick={() => setActiveSection("closeFriends")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left flex-shrink-0 cursor-pointer ${
            activeSection === "closeFriends" ? "glass font-semibold" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-550 dark:text-zinc-400"
          }`}
        >
          <Star className="w-5 h-5 text-green-500 fill-green-500" />
          <span>Близкие друзья</span>
        </button>
        <button
          onClick={() => setActiveSection("sessions")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left flex-shrink-0 cursor-pointer ${
            activeSection === "sessions" ? "glass font-semibold" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-550 dark:text-zinc-400"
          }`}
        >
          <Monitor className="w-5 h-5" />
          <span>Безопасность и входы</span>
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
        {activeSection === "profile" ? (
        <>
        <h2 className="text-xl font-bold mb-8">Редактировать профиль</h2>

        <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-lg">
          
          {/* Picture preview change */}
          <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-150 dark:border-zinc-800">
            <Avatar src={getFullImageUrl(currentUser.avatar)} name={currentUser.username} className="w-14 h-14 border border-zinc-200 dark:border-zinc-800" />
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
        </>
        ) : activeSection === "closeFriends" ? (
        <div className="max-w-lg flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Star className="w-5 h-5 text-green-500 fill-green-500" /> Близкие друзья
            </h2>
            <p className="text-sm text-zinc-500">
              Истории, помеченные зелёной звездой, увидят только люди из этого списка. Они не узнают, что находятся в нём.
            </p>
          </div>

          {/* Search + add */}
          <div className="flex flex-col gap-3">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={cfSearch}
                onChange={(e) => setCfSearch(e.target.value)}
                placeholder="Найти пользователя..."
                className="w-full glass rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none text-zinc-900 dark:text-white"
              />
            </div>

            {cfSearch.trim() && (
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto no-scrollbar">
                {cfSearching ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full shimmer" />
                      <div className="w-32 h-3 rounded-full shimmer" />
                    </div>
                  ))
                ) : cfResults.length === 0 ? (
                  <p className="text-sm text-zinc-450 py-2">Ничего не найдено.</p>
                ) : (
                  cfResults
                    .filter((u) => (u.id || u.userId) !== currentUser.id)
                    .map((u) => {
                      const uid = u.id || u.userId;
                      const already = closeFriends.some((f) => (f.id || f.userId) === uid);
                      return (
                        <div key={uid} className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={getFullImageUrl(u.avatar || u.imagePath)}
                              name={u.userName || u.username}
                              className="w-10 h-10 border border-zinc-200 dark:border-zinc-800"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-sm truncate">{u.userName || u.username}</span>
                              <span className="text-xs text-zinc-450 truncate">{u.fullName || ""}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddCloseFriend(u)}
                            disabled={already || cfBusy[uid]}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ml-2 cursor-pointer disabled:opacity-60 ${
                              already ? "glass" : "bg-green-500 hover:bg-green-600 text-white"
                            }`}
                          >
                            {already ? "Добавлен" : "Добавить"}
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Current list */}
          <div>
            <h3 className="text-base font-bold mb-4">
              Ваш список {closeFriends.length > 0 && <span className="text-zinc-450 font-normal">({closeFriends.length})</span>}
            </h3>
            {cfLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full shimmer" />
                    <div className="w-32 h-3 rounded-full shimmer" />
                  </div>
                ))}
              </div>
            ) : closeFriends.length === 0 ? (
              <p className="text-sm text-zinc-450">Список пуст. Найдите пользователей выше, чтобы добавить их.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {closeFriends.map((u) => {
                  const uid = u.id || u.userId;
                  return (
                    <div key={uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <Avatar
                            src={getFullImageUrl(u.avatar || u.imagePath)}
                            name={u.userName || u.username}
                            className="w-10 h-10 border-2 border-green-500"
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center border-2 border-[var(--background)]">
                            <Star className="w-2 h-2 fill-white text-white" />
                          </span>
                        </div>
                        <span className="font-semibold text-sm truncate">{u.userName || u.username}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveCloseFriend(uid)}
                        disabled={cfBusy[uid]}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg glass hover:shadow-soft cursor-pointer flex-shrink-0 ml-2 disabled:opacity-60"
                      >
                        Удалить
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        ) : activeSection === "sessions" ? (
        <div className="max-w-lg flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <Monitor className="w-5 h-5" /> Безопасность и входы
            </h2>
            <p className="text-sm text-zinc-500">
              Устройства, на которых сейчас выполнен вход в ваш аккаунт. Если вы не узнаёте устройство — завершите сеанс.
            </p>
          </div>

          {sessionsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl shimmer" />
                  <div className="flex flex-col gap-2">
                    <div className="w-40 h-3 rounded-full shimmer" />
                    <div className="w-24 h-2.5 rounded-full shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessionsError ? (
            <p className="text-sm text-red-500">{sessionsError}</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-zinc-450">Активных сеансов не найдено.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      {s.isMobile ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm truncate flex items-center gap-2">
                        {s.device}
                        {s.isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 flex-shrink-0">
                            Текущий сеанс
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">
                        IP: {s.ip} · {formatSessionDate(s.loggedInAt)}
                      </span>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <button
                      onClick={() => handleLogoutSession(s.id)}
                      disabled={sessionBusy[s.id]}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg glass hover:shadow-soft text-red-500 cursor-pointer flex-shrink-0 disabled:opacity-60"
                    >
                      {sessionBusy[s.id] ? "..." : "Выйти"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        ) : (
        <div className="max-w-lg flex flex-col gap-10">
          <div>
            <h2 className="text-xl font-bold mb-8">Конфиденциальность</h2>

            {/* Private account toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-150 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Закрытый аккаунт</span>
                  <span className="text-xs text-zinc-500 mt-0.5 max-w-xs">
                    Если аккаунт закрыт, только одобренные вами подписчики смогут видеть ваши публикации.
                  </span>
                </div>
              </div>
              <button
                onClick={handleTogglePrivate}
                disabled={privacyBusy}
                className={`relative w-11 h-6 rounded-full transition flex-shrink-0 cursor-pointer disabled:opacity-50 ${
                  currentUser.isPrivate ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    currentUser.isPrivate ? "translate-x-5.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Blocked accounts */}
          <div>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <Ban className="w-4.5 h-4.5" /> Заблокированные аккаунты
            </h3>
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-zinc-450">У вас нет заблокированных пользователей.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {blockedUsers.map((u) => {
                  const uid = u.id || u.userId;
                  return (
                    <div key={uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={getFullImageUrl(u.avatar || u.imagePath)}
                          name={u.userName || u.username}
                          className="w-10 h-10 border border-zinc-200 dark:border-zinc-800"
                        />
                        <span className="font-semibold text-sm">{u.userName || u.username}</span>
                      </div>
                      <button
                        onClick={() => handleUnblock(uid)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg glass hover:shadow-soft cursor-pointer"
                      >
                        Разблокировать
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hidden stories */}
          <div>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <EyeOff className="w-4.5 h-4.5" /> Скрыли истории от...
            </h3>
            {hiddenUsers.length === 0 ? (
              <p className="text-sm text-zinc-450">Вы не скрывали истории ни от кого.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {hiddenUsers.map((u) => {
                  const uid = u.id || u.userId;
                  return (
                    <div key={uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={getFullImageUrl(u.avatar || u.imagePath)}
                          name={u.userName || u.username}
                          className="w-10 h-10 border border-zinc-200 dark:border-zinc-800"
                        />
                        <span className="font-semibold text-sm">{u.userName || u.username}</span>
                      </div>
                      <button
                        onClick={() => handleUnhide(uid)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg glass hover:shadow-soft cursor-pointer"
                      >
                        Показать снова
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

    </div>
  );
}
