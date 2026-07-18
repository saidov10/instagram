"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { logout, updateProfile, updateAvatar, fetchMyProfile, updatePrivacy, updateUsername as updateUsernameAction } from "../store/slices/authSlice";
import { AppDispatch, RootState } from "../store/store";
import { useApp } from "../context/AppContext";
import { api, getFullImageUrl } from "../services/api";
import { User, Sun, Moon, LogOut, Shield, Bell, HelpCircle, Lock, Ban, EyeOff, Star, Search, Monitor, Smartphone, UserX, VolumeX, AlertTriangle, Briefcase, X, Download, AtSign } from "lucide-react";
import Avatar from "../components/Avatar";
import Toggle from "../components/Toggle";
import { toast } from "../lib/toast";
import { confirmDialog } from "../lib/confirm";

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
  const [fullName, setFullName] = useState(currentUser?.fullName || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [website, setWebsite] = useState(currentUser?.website || "");
  const [pronouns, setPronouns] = useState(currentUser?.pronouns || "");
  const [bio, setBio] = useState(currentUser?.about || "");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Username availability (live-checked while typing)
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Security activity log
  const [securityLog, setSecurityLog] = useState<any[]>([]);
  const [securityLogLoading, setSecurityLogLoading] = useState(false);

  // Appeals ("Справка")
  const [appeals, setAppeals] = useState<any[]>([]);
  const [appealsLoading, setAppealsLoading] = useState(false);
  const [appealTargetType, setAppealTargetType] = useState<"POST" | "COMMENT" | "STORY" | "USER">("USER");
  const [appealTargetId, setAppealTargetId] = useState("");
  const [appealReason, setAppealReason] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealMessage, setAppealMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Change-password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Mention permission + business contact info (#7 profile depth)
  const [mentionBusy, setMentionBusy] = useState(false);
  const [bizEmail, setBizEmail] = useState(currentUser?.businessEmail || "");
  const [bizPhone, setBizPhone] = useState(currentUser?.businessPhone || "");
  const [bizAddress, setBizAddress] = useState(currentUser?.businessAddress || "");
  const [bizCategory, setBizCategory] = useState(currentUser?.businessCategory || "");
  const [bizSaving, setBizSaving] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);

  // Section navigation + privacy panel state
  const [activeSection, setActiveSection] = useState<"profile" | "privacy" | "closeFriends" | "sessions" | "support" | "notifications">("profile");
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [hiddenUsers, setHiddenUsers] = useState<any[]>([]);
  const [restrictedUsers, setRestrictedUsers] = useState<any[]>([]);
  const [mutedUsers, setMutedUsers] = useState<any[]>([]);
  // Sensitive-content viewer preference (#24): Less=HIDE, Standard=BLUR, More=SHOW
  const [sensitiveLevel, setSensitiveLevel] = useState<"HIDE" | "BLUR" | "SHOW">("BLUR");
  const [sensitiveBusy, setSensitiveBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [deletionRequested, setDeletionRequested] = useState(
    typeof window !== "undefined" && localStorage.getItem("instagram_deletion_requested") === "1"
  );
  const [activityStatusBusy, setActivityStatusBusy] = useState(false);

  // Quiet mode
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("07:00");
  const [quietBusy, setQuietBusy] = useState(false);
  useEffect(() => {
    setQuietEnabled(!!currentUser?.isInQuietMode);
  }, [currentUser?.isInQuietMode]);

  // Muted words
  const [mutedWords, setMutedWords] = useState<string[]>([]);
  const [mutedWordInput, setMutedWordInput] = useState("");
  const [mutedWordBusy, setMutedWordBusy] = useState(false);

  // Notification category settings
  const [notifSettings, setNotifSettings] = useState<Record<string, boolean>>({});
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifBusy, setNotifBusy] = useState<Record<string, boolean>>({});

  // Browser push token (storage/logging only — no real FCM/APNs delivery behind it)
  const [pushEnabled, setPushEnabled] = useState(
    typeof window !== "undefined" && !!localStorage.getItem("instagram_push_token")
  );
  const [pushBusy, setPushBusy] = useState(false);

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
    api.user.getRestrictedUsers()
      .then((list) => setRestrictedUsers(list || []))
      .catch(() => setRestrictedUsers([]));
    api.user.getMutedUsers()
      .then((list) => setMutedUsers(list || []))
      .catch(() => setMutedUsers([]));
    api.user.getMutedWords()
      .then((list) => setMutedWords(list || []))
      .catch(() => setMutedWords([]));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "notifications") return;
    setNotifLoading(true);
    api.notification.getSettings()
      .then((settings) => setNotifSettings(settings || {}))
      .catch(() => setNotifSettings({}))
      .finally(() => setNotifLoading(false));
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

  // Live-check username availability while typing (skips the no-op case of the current username)
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || trimmed === currentUser?.username) {
      setUsernameAvailable(null);
      setUsernameChecking(false);
      return;
    }
    setUsernameChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.account.checkUsernameAvailability(trimmed);
        setUsernameAvailable(!!res?.isAvailable);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username, currentUser?.username]);

  useEffect(() => {
    if (activeSection !== "sessions") return;
    setSecurityLogLoading(true);
    api.account.getSecurityLog()
      .then((list) => setSecurityLog(list || []))
      .catch(() => setSecurityLog([]))
      .finally(() => setSecurityLogLoading(false));
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "support") return;
    setAppealsLoading(true);
    api.report.getMyAppeals()
      .then((list) => setAppeals(list || []))
      .catch(() => setAppeals([]))
      .finally(() => setAppealsLoading(false));
  }, [activeSection]);

  const appealStatusLabel: Record<string, string> = {
    PENDING: "На рассмотрении",
    APPROVED: "Одобрена",
    REJECTED: "Отклонена",
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealTargetId.trim() || !appealReason.trim()) return;
    setAppealSubmitting(true);
    setAppealMessage(null);
    try {
      const created = await api.report.submitAppeal({
        targetType: appealTargetType,
        targetId: appealTargetId.trim(),
        reason: appealReason.trim(),
      });
      setAppeals((prev) => [created, ...prev]);
      setAppealTargetId("");
      setAppealReason("");
      setAppealMessage({ type: "ok", text: "Апелляция отправлена." });
    } catch (err: any) {
      setAppealMessage({ type: "err", text: err?.message || "Не удалось отправить апелляцию." });
    } finally {
      setAppealSubmitting(false);
    }
  };

  const securityEventLabel: Record<string, string> = {
    ACCOUNT_CREATED: "Аккаунт создан",
    LOGIN: "Вход в аккаунт",
    PASSWORD_CHANGED: "Пароль изменён",
    USERNAME_CHANGED: "Изменено имя пользователя",
    DEACTIVATED: "Аккаунт деактивирован",
    REACTIVATED: "Аккаунт восстановлен",
    DELETION_REQUESTED: "Запрошено удаление аккаунта",
  };

  const handleLogoutSession = async (sessionId: string) => {
    if (sessionBusy[sessionId]) return;
    if (!(await confirmDialog({ message: "Завершить сеанс на этом устройстве?", confirmText: "Завершить", destructive: true }))) return;
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

  const handleUnrestrict = async (userId: string) => {
    try {
      await api.user.unrestrictUser(userId);
      setRestrictedUsers((prev) => prev.filter((u) => (u.id || u.userId) !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnmute = async (userId: string) => {
    try {
      await api.user.unmuteUser(userId);
      setMutedUsers((prev) => prev.filter((u) => (u.id || u.userId) !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivate = async () => {
    if (!(await confirmDialog({ message: "Ваш профиль будет скрыт, пока вы снова не войдёте. Продолжить?", confirmText: "Продолжить", destructive: true }))) return;
    try {
      await api.account.deactivate();
    } catch (err) {
      console.error("Failed to deactivate:", err);
    } finally {
      // Server logs out all sessions; drop the local token and return to login.
      dispatch(logout());
      router.push("/login");
    }
  };

  const handleExportData = async () => {
    if (exportBusy) return;
    setExportBusy(true);
    try {
      const data = await api.account.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `instagram-data-${currentUser?.username || "export"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export data:", err);
    } finally {
      setExportBusy(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (deletionBusy) return;
    if (!(await confirmDialog({ message: "Аккаунт будет запланирован на удаление через 30 дней. Продолжить?", confirmText: "Продолжить", destructive: true }))) return;
    setDeletionBusy(true);
    try {
      await api.account.requestDeletion();
      localStorage.setItem("instagram_deletion_requested", "1");
      setDeletionRequested(true);
    } catch (err) {
      console.error("Failed to request deletion:", err);
    } finally {
      setDeletionBusy(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (deletionBusy) return;
    setDeletionBusy(true);
    try {
      await api.account.cancelDeletion();
      localStorage.removeItem("instagram_deletion_requested");
      setDeletionRequested(false);
    } catch (err) {
      console.error("Failed to cancel deletion:", err);
    } finally {
      setDeletionBusy(false);
    }
  };

  const handleToggleActivityStatus = async () => {
    if (!currentUser || activityStatusBusy) return;
    setActivityStatusBusy(true);
    try {
      await api.profile.updateActivityStatusVisibility(!currentUser.showActivityStatus);
      await dispatch(fetchMyProfile());
    } catch (err) {
      console.error("Failed to update activity status visibility:", err);
    } finally {
      setActivityStatusBusy(false);
    }
  };

  const handleToggleQuietMode = async () => {
    if (quietBusy) return;
    const next = !quietEnabled;
    setQuietBusy(true);
    try {
      await api.user.updateQuietMode({ enabled: next, startTime: quietStart, endTime: quietEnd });
      setQuietEnabled(next);
      await dispatch(fetchMyProfile());
    } catch (err) {
      console.error("Failed to update quiet mode:", err);
    } finally {
      setQuietBusy(false);
    }
  };

  const handleSaveQuietHours = async () => {
    if (!quietEnabled || quietBusy) return;
    setQuietBusy(true);
    try {
      await api.user.updateQuietMode({ enabled: true, startTime: quietStart, endTime: quietEnd });
    } catch (err) {
      console.error("Failed to update quiet mode hours:", err);
    } finally {
      setQuietBusy(false);
    }
  };

  const handleAddMutedWord = async () => {
    const word = mutedWordInput.trim();
    if (!word || mutedWordBusy || mutedWords.includes(word)) return;
    setMutedWordBusy(true);
    try {
      await api.user.addMutedWord(word);
      setMutedWords((prev) => [...prev, word]);
      setMutedWordInput("");
    } catch (err) {
      console.error("Failed to add muted word:", err);
    } finally {
      setMutedWordBusy(false);
    }
  };

  const handleRemoveMutedWord = async (word: string) => {
    const snapshot = mutedWords;
    setMutedWords((prev) => prev.filter((w) => w !== word));
    try {
      await api.user.removeMutedWord(word);
    } catch (err) {
      console.error("Failed to remove muted word:", err);
      setMutedWords(snapshot);
    }
  };

  const handleTogglePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (!pushEnabled) {
        if (typeof Notification !== "undefined" && Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (typeof Notification === "undefined" || Notification.permission !== "granted") {
          toast("Разрешите уведомления в браузере, чтобы включить эту опцию.", "error");
          return;
        }
        const token = localStorage.getItem("instagram_push_token") || crypto.randomUUID();
        await api.notification.registerPushToken(token, "WEB");
        localStorage.setItem("instagram_push_token", token);
        setPushEnabled(true);
      } else {
        const token = localStorage.getItem("instagram_push_token");
        if (token) await api.notification.unregisterPushToken(token);
        localStorage.removeItem("instagram_push_token");
        setPushEnabled(false);
      }
    } catch (err) {
      console.error("Failed to toggle push notifications:", err);
    } finally {
      setPushBusy(false);
    }
  };

  const handleToggleNotifSetting = async (category: "LIKES" | "COMMENTS" | "FOLLOWS" | "MENTIONS" | "MESSAGES") => {
    if (notifBusy[category]) return;
    const next = !notifSettings[category];
    setNotifBusy((b) => ({ ...b, [category]: true }));
    setNotifSettings((prev) => ({ ...prev, [category]: next }));
    try {
      await api.notification.updateSettings(category, next);
    } catch (err) {
      console.error("Failed to update notification setting:", err);
      setNotifSettings((prev) => ({ ...prev, [category]: !next }));
    } finally {
      setNotifBusy((b) => ({ ...b, [category]: false }));
    }
  };

  const handleAccountType = async (type: "PERSONAL" | "BUSINESS" | "CREATOR") => {
    setAccountBusy(true);
    try {
      await api.profile.updateAccountType(type);
      await dispatch(fetchMyProfile());
    } catch (err) {
      console.error("Failed to update account type:", err);
    } finally {
      setAccountBusy(false);
    }
  };

  const handleMentionPermission = async (permission: "EVERYONE" | "FOLLOWING") => {
    if (!currentUser || mentionBusy || currentUser.mentionPermission === permission) return;
    setMentionBusy(true);
    try {
      await api.profile.updateMentionPermission(permission);
      await dispatch(fetchMyProfile());
    } catch (err) {
      console.error("Failed to update mention permission:", err);
    } finally {
      setMentionBusy(false);
    }
  };

  const handleSaveBusinessInfo = async () => {
    if (bizSaving) return;
    setBizSaving(true);
    try {
      await api.profile.updateBusinessInfo({
        businessEmail: bizEmail.trim(),
        businessPhone: bizPhone.trim(),
        businessAddress: bizAddress.trim(),
        businessCategory: bizCategory.trim(),
      });
      await dispatch(fetchMyProfile());
      setBizSaved(true);
      setTimeout(() => setBizSaved(false), 2000);
    } catch (err) {
      console.error("Failed to update business info:", err);
    } finally {
      setBizSaving(false);
    }
  };

  const handleSensitiveLevel = async (level: "HIDE" | "BLUR" | "SHOW") => {
    const prev = sensitiveLevel;
    setSensitiveLevel(level);
    setSensitiveBusy(true);
    try {
      await api.profile.updateSensitiveContentSetting(level);
    } catch (err) {
      console.error("Failed to update sensitive content setting:", err);
      setSensitiveLevel(prev);
    } finally {
      setSensitiveBusy(false);
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
    setSaveError(null);
    const trimmedUsername = username.trim();
    if (trimmedUsername !== currentUser?.username && usernameAvailable === false) {
      setSaveError("Это имя пользователя уже занято — измените его или верните прежнее значение.");
      return;
    }
    setSaving(true);
    try {
      if (trimmedUsername && trimmedUsername !== currentUser?.username && usernameAvailable) {
        await dispatch(updateUsernameAction(trimmedUsername)).unwrap();
      }
      await dispatch(updateProfile({ about: bio, fullName, website, pronouns })).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error(err);
      setSaveError(typeof err === "string" ? err : err?.message || "Не удалось сохранить изменения. Попробуйте ещё раз.");
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
            activeSection === "profile" ? "glass" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 font-normal"
          }`}
        >
          <User className="w-5 h-5 stroke-[1.8px]" />
          <span>Редактировать профиль</span>
        </button>
        <button onClick={toggleTheme} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm text-left flex-shrink-0 cursor-pointer text-zinc-600 dark:text-zinc-400">
          {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          <span>Сменить тему ({theme === "dark" ? "Светлая" : "Темная"})</span>
        </button>
        <button
          onClick={() => setActiveSection("privacy")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left flex-shrink-0 cursor-pointer ${
            activeSection === "privacy" ? "glass font-semibold" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>Конфиденциальность</span>
        </button>
        <button
          onClick={() => setActiveSection("closeFriends")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left flex-shrink-0 cursor-pointer ${
            activeSection === "closeFriends" ? "glass font-semibold" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Star className="w-5 h-5 text-green-500 fill-green-500" />
          <span>Близкие друзья</span>
        </button>
        <button
          onClick={() => setActiveSection("sessions")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left flex-shrink-0 cursor-pointer ${
            activeSection === "sessions" ? "glass font-semibold" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Monitor className="w-5 h-5" />
          <span>Безопасность и входы</span>
        </button>
        <button
          onClick={() => setActiveSection("notifications")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left flex-shrink-0 cursor-pointer ${
            activeSection === "notifications" ? "glass font-semibold" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
          }`}
        >
          <Bell className="w-5 h-5" />
          <span>Уведомления</span>
        </button>
        <button
          onClick={() => setActiveSection("support")}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left flex-shrink-0 cursor-pointer ${
            activeSection === "support" ? "glass font-semibold" : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
          }`}
        >
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
          <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Avatar src={getFullImageUrl(currentUser.avatar)} name={currentUser.username} className="w-14 h-14 border border-zinc-200 dark:border-zinc-800" />
            <div className="flex flex-col items-start">
              <span className="font-bold text-sm">{currentUser.username}</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-500 hover:text-blue-600 text-xs font-bold text-left cursor-pointer mt-1"
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

          {/* Full Name input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">Имя</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          {/* Username input — live availability check */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">Имя пользователя</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                className="w-full bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 pr-8 text-sm text-zinc-900 dark:text-white"
              />
              {username.trim() !== currentUser.username && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs">
                  {usernameChecking ? (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  ) : usernameAvailable === true ? (
                    <span className="text-green-500">✓</span>
                  ) : usernameAvailable === false ? (
                    <span className="text-red-500">✕</span>
                  ) : null}
                </span>
              )}
            </div>
            {username.trim() !== currentUser.username && !usernameChecking && usernameAvailable === false && (
              <span className="text-xs text-red-500">Это имя пользователя уже занято.</span>
            )}
          </div>

          {/* Website input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">Сайт</label>
            <input
              type="text"
              placeholder="https://"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          {/* Pronouns input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-400 dark:text-zinc-500">Местоимения</label>
            <input
              type="text"
              placeholder="она/её, он/его…"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          {/* Bio input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-500">О себе</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm resize-none text-zinc-900 dark:text-white"
            />
          </div>

          {/* Save button and status */}
          <div className="flex items-center gap-4 mt-2">
            <button
              type="submit"
              disabled={saving || (username.trim() !== currentUser.username && (usernameChecking || usernameAvailable === false))}
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

        {/* ----------------- ACCOUNT TYPE (#20) ----------------- */}
        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 max-w-lg">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Briefcase className="w-5 h-5" /> Тип аккаунта
          </h3>
          <p className="text-sm text-zinc-500 mb-5">
            Бизнес и авторские аккаунты получают доступ к статистике и профессиональным инструментам.
          </p>
          <div className="flex flex-col gap-2">
            {([
              { type: "PERSONAL", title: "Личный", desc: "Обычный аккаунт" },
              { type: "BUSINESS", title: "Бизнес", desc: "Для компаний и брендов" },
              { type: "CREATOR", title: "Автор", desc: "Для блогеров и создателей контента" },
            ] as const).map((opt) => (
              <button
                key={opt.type}
                onClick={() => handleAccountType(opt.type)}
                disabled={accountBusy}
                className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer text-left ${
                  (currentUser.accountType || "PERSONAL") === opt.type
                    ? "border-blue-500 bg-blue-500/5"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{opt.title}</span>
                  <span className="text-xs text-zinc-500">{opt.desc}</span>
                </div>
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${(currentUser.accountType || "PERSONAL") === opt.type ? "border-blue-500 bg-blue-500" : "border-zinc-300 dark:border-zinc-600"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* ----------------- BUSINESS CONTACT INFO (#20) — Business/Creator only ----------------- */}
        {(currentUser.accountType === "BUSINESS" || currentUser.accountType === "CREATOR") && (
          <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 max-w-lg">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Briefcase className="w-5 h-5" /> Контактная информация
            </h3>
            <p className="text-sm text-zinc-500 mb-5">
              Появится в вашем профиле кнопками «Эл. адрес», «Позвонить» и «Как добраться».
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="email"
                value={bizEmail}
                onChange={(e) => setBizEmail(e.target.value)}
                placeholder="Контактный e-mail"
                className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                type="tel"
                value={bizPhone}
                onChange={(e) => setBizPhone(e.target.value)}
                placeholder="Контактный телефон"
                className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                type="text"
                value={bizAddress}
                onChange={(e) => setBizAddress(e.target.value)}
                placeholder="Адрес"
                className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                type="text"
                value={bizCategory}
                onChange={(e) => setBizCategory(e.target.value)}
                placeholder="Категория (напр. Ресторан)"
                className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveBusinessInfo}
                  disabled={bizSaving}
                  className="btn-primary text-sm px-5 py-2.5 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {bizSaving ? "Сохранение..." : "Сохранить"}
                </button>
                {bizSaved && <span className="text-sm font-semibold text-green-500">Сохранено</span>}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- DEACTIVATE ACCOUNT (#22) ----------------- */}
        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 max-w-lg">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Ban className="w-5 h-5" /> Временно деактивировать аккаунт
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Ваш профиль, публикации и комментарии будут скрыты, пока вы снова не войдёте. Аккаунт восстановится автоматически при следующем входе.
          </p>
          <button
            onClick={handleDeactivate}
            className="text-sm font-bold text-red-500 border border-red-500/40 hover:bg-red-500/5 px-5 py-2.5 rounded-lg transition cursor-pointer"
          >
            Деактивировать мой аккаунт
          </button>
        </div>

        {/* ----------------- DATA EXPORT ----------------- */}
        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 max-w-lg">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <Download className="w-5 h-5" /> Скачать ваши данные
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Получите копию профиля, публикаций и другой информации в формате JSON.
          </p>
          <button
            onClick={handleExportData}
            disabled={exportBusy}
            className="text-sm font-bold glass hover:shadow-soft px-5 py-2.5 rounded-lg transition cursor-pointer disabled:opacity-50"
          >
            {exportBusy ? "Подготовка..." : "Скачать данные"}
          </button>
        </div>

        {/* ----------------- ACCOUNT DELETION ----------------- */}
        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 max-w-lg">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" /> Удалить аккаунт
          </h3>
          {deletionRequested ? (
            <>
              <p className="text-sm text-zinc-500 mb-4">
                Ваш аккаунт будет удалён безвозвратно через 30 дней. Войдите снова в это время, чтобы автоматически отменить удаление.
              </p>
              <button
                onClick={handleCancelDeletion}
                disabled={deletionBusy}
                className="text-sm font-bold glass hover:shadow-soft px-5 py-2.5 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                Отменить удаление
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-500 mb-4">
                Аккаунт будет запланирован на удаление через 30 дней. Вход в систему в этот период автоматически отменяет удаление.
              </p>
              <button
                onClick={handleRequestDeletion}
                disabled={deletionBusy}
                className="text-sm font-bold text-red-500 border border-red-500/40 hover:bg-red-500/5 px-5 py-2.5 rounded-lg transition cursor-pointer disabled:opacity-50"
              >
                Запросить удаление аккаунта
              </button>
            </>
          )}
        </div>

        {/* ----------------- CHANGE PASSWORD ----------------- */}
        <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 max-w-lg">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Lock className="w-5 h-5" /> Сменить пароль
          </h3>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-500">Текущий пароль</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-500">Новый пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-500">Подтвердите новый пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-transparent border border-zinc-300 dark:border-zinc-800 focus:border-zinc-500 dark:focus:border-zinc-700 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
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
                  <p className="text-sm text-zinc-500 py-2">Ничего не найдено.</p>
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
                              <span className="text-xs text-zinc-500 truncate">{u.fullName || ""}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddCloseFriend(u)}
                            disabled={already || cfBusy[uid]}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ml-2 cursor-pointer disabled:opacity-60 ${
                              already ? "glass" : "btn-primary"
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
              Ваш список {closeFriends.length > 0 && <span className="text-zinc-500 font-normal">({closeFriends.length})</span>}
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
              <p className="text-sm text-zinc-500">Список пуст. Найдите пользователей выше, чтобы добавить их.</p>
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
            <p className="text-sm text-zinc-500">Активных сеансов не найдено.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800"
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

          {/* Security activity log */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold uppercase text-zinc-400 dark:text-zinc-500 mb-3">Журнал активности</h3>
            {securityLogLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-full h-10 rounded-lg shimmer" />
                ))}
              </div>
            ) : securityLog.length === 0 ? (
              <p className="text-sm text-zinc-500">Событий пока нет.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {securityLog.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold">{securityEventLabel[ev.type] || ev.type}</span>
                      <span className="text-xs text-zinc-500 truncate">
                        {ev.ip ? `IP: ${ev.ip}` : ""}{ev.userAgent ? ` · ${ev.userAgent.slice(0, 40)}` : ""}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500 flex-shrink-0">{formatSessionDate(ev.createAt || ev.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        ) : activeSection === "support" ? (
        <div className="max-w-lg flex flex-col gap-8">
          <div>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <HelpCircle className="w-5 h-5" /> Справка
            </h2>
            <p className="text-sm text-zinc-500">
              Если публикация, комментарий, история или аккаунт были заблокированы по ошибке — отправьте апелляцию.
            </p>
          </div>

          <form onSubmit={handleSubmitAppeal} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-500">Тип объекта</label>
              <select
                value={appealTargetType}
                onChange={(e) => setAppealTargetType(e.target.value as typeof appealTargetType)}
                className="bg-transparent border border-zinc-300 dark:border-zinc-800 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
              >
                <option value="USER">Аккаунт</option>
                <option value="POST">Публикация</option>
                <option value="COMMENT">Комментарий</option>
                <option value="STORY">История</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-500">ID объекта</label>
              <input
                type="text"
                value={appealTargetId}
                onChange={(e) => setAppealTargetId(e.target.value)}
                placeholder="Например, ID публикации"
                className="bg-transparent border border-zinc-300 dark:border-zinc-800 outline-none rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-500">Причина апелляции</label>
              <textarea
                rows={3}
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                className="bg-transparent border border-zinc-300 dark:border-zinc-800 outline-none rounded-lg px-3 py-2 text-sm resize-none text-zinc-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={appealSubmitting || !appealTargetId.trim() || !appealReason.trim()}
                className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition cursor-pointer"
              >
                {appealSubmitting ? "Отправка..." : "Отправить апелляцию"}
              </button>
              {appealMessage && (
                <span className={`text-sm font-semibold ${appealMessage.type === "ok" ? "text-green-500" : "text-red-500"}`}>
                  {appealMessage.text}
                </span>
              )}
            </div>
          </form>

          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold uppercase text-zinc-400 dark:text-zinc-500 mb-3">Ваши апелляции</h3>
            {appealsLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="w-full h-12 rounded-lg shimmer" />
                ))}
              </div>
            ) : appeals.length === 0 ? (
              <p className="text-sm text-zinc-500">Апелляций пока нет.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {appeals.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold truncate">{a.targetType} · {a.reason}</span>
                      <span className="text-xs text-zinc-500">{formatSessionDate(a.createAt || a.createdAt)}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                      a.status === "APPROVED" ? "bg-green-500/15 text-green-600 dark:text-green-400" :
                      a.status === "REJECTED" ? "bg-red-500/15 text-red-500" :
                      "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                    }`}>
                      {appealStatusLabel[a.status] || a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        ) : activeSection === "notifications" ? (
        <div className="max-w-lg flex flex-col gap-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5" /> Уведомления
          </h2>

          <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Push-уведомления в браузере</span>
              <span className="text-xs text-zinc-500 mt-0.5 max-w-xs">Хранится только на этом устройстве.</span>
            </div>
            <Toggle checked={pushEnabled} onChange={handleTogglePush} disabled={pushBusy} label="Push-уведомления" />
          </div>

          {notifLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-full h-14 rounded-xl shimmer" />
              ))}
            </div>
          ) : (
            ([
              { key: "LIKES", label: "Отметки «Нравится»" },
              { key: "COMMENTS", label: "Комментарии" },
              { key: "FOLLOWS", label: "Подписки" },
              { key: "MENTIONS", label: "Упоминания" },
              { key: "MESSAGES", label: "Сообщения" },
            ] as const).map((cat) => (
              <div
                key={cat.key}
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800"
              >
                <span className="font-semibold text-sm">{cat.label}</span>
                <Toggle
                  checked={notifSettings[cat.key] !== false}
                  onChange={() => handleToggleNotifSetting(cat.key)}
                  disabled={notifBusy[cat.key]}
                  label={cat.label}
                />
              </div>
            ))
          )}
        </div>
        ) : (
        <div className="max-w-lg flex flex-col gap-10">
          <div>
            <h2 className="text-xl font-bold mb-8">Конфиденциальность</h2>

            {/* Private account toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Закрытый аккаунт</span>
                  <span className="text-xs text-zinc-500 mt-0.5 max-w-xs">
                    Если аккаунт закрыт, только одобренные вами подписчики смогут видеть ваши публикации.
                  </span>
                </div>
              </div>
              <Toggle checked={currentUser.isPrivate} onChange={handleTogglePrivate} disabled={privacyBusy} label="Закрытый аккаунт" />
            </div>

            {/* Activity status toggle */}
            <div className="flex items-center justify-between p-4 mt-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <EyeOff className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Показывать статус активности</span>
                  <span className="text-xs text-zinc-500 mt-0.5 max-w-xs">
                    Если выключено, вы также не будете видеть, когда были активны другие пользователи.
                  </span>
                </div>
              </div>
              <Toggle checked={currentUser.showActivityStatus} onChange={handleToggleActivityStatus} disabled={activityStatusBusy} label="Показывать статус активности" />
            </div>

            {/* Allow @mentions from */}
            <div className="flex flex-col gap-3 p-4 mt-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <AtSign className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Кто может упоминать вас</span>
                  <span className="text-xs text-zinc-500 mt-0.5 max-w-xs">
                    Если выбрать «Подписки», отметить вас через @ сможет только тот, на кого вы подписаны.
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 pl-8">
                {([
                  ["EVERYONE", "Все"],
                  ["FOLLOWING", "Только те, на кого вы подписаны"],
                ] as const).map(([value, label]) => {
                  const active = (currentUser.mentionPermission || "EVERYONE") === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleMentionPermission(value)}
                      disabled={mentionBusy}
                      className="flex items-center justify-between py-1.5 text-sm cursor-pointer disabled:opacity-50 text-left"
                    >
                      <span className={active ? "font-semibold text-blue-500" : ""}>{label}</span>
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${active ? "border-blue-500 bg-blue-500" : "border-zinc-300 dark:border-zinc-600"}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quiet mode */}
            <div className="flex flex-col gap-3 p-4 mt-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Moon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">Тихий режим</span>
                    <span className="text-xs text-zinc-500 mt-0.5 max-w-xs">
                      В указанные часы другие увидят пометку «В тихом режиме» на вашем профиле.
                    </span>
                  </div>
                </div>
                <Toggle checked={quietEnabled} onChange={handleToggleQuietMode} disabled={quietBusy} label="Тихий режим" />
              </div>
              {quietEnabled && (
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={quietStart}
                    onChange={(e) => setQuietStart(e.target.value)}
                    onBlur={handleSaveQuietHours}
                    className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm outline-none"
                  />
                  <span className="text-xs text-zinc-500">до</span>
                  <input
                    type="time"
                    value={quietEnd}
                    onChange={(e) => setQuietEnd(e.target.value)}
                    onBlur={handleSaveQuietHours}
                    className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm outline-none"
                  />
                </div>
              )}
            </div>

            {/* Muted words */}
            <div className="flex flex-col gap-3 p-4 mt-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-start gap-3">
                <VolumeX className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Скрытые слова</span>
                  <span className="text-xs text-zinc-500 mt-0.5 max-w-xs">
                    Комментарии, содержащие эти слова, будут скрыты автоматически.
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mutedWordInput}
                  onChange={(e) => setMutedWordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddMutedWord()}
                  placeholder="Добавить слово"
                  className="flex-1 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-sm outline-none"
                />
                <button
                  onClick={handleAddMutedWord}
                  disabled={!mutedWordInput.trim() || mutedWordBusy}
                  className="text-sm font-bold text-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  Добавить
                </button>
              </div>
              {mutedWords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mutedWords.map((w) => (
                    <span key={w} className="flex items-center gap-1.5 glass rounded-full pl-3 pr-2 py-1 text-xs font-semibold">
                      {w}
                      <button onClick={() => handleRemoveMutedWord(w)} className="hover:text-red-500 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Blocked accounts */}
          <div>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <Ban className="w-4.5 h-4.5" /> Заблокированные аккаунты
            </h3>
            {blockedUsers.length === 0 ? (
              <p className="text-sm text-zinc-500">У вас нет заблокированных пользователей.</p>
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
              <p className="text-sm text-zinc-500">Вы не скрывали истории ни от кого.</p>
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

          {/* Restricted accounts */}
          <div>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <UserX className="w-4.5 h-4.5" /> Ограниченные аккаунты
            </h3>
            {restrictedUsers.length === 0 ? (
              <p className="text-sm text-zinc-500">У вас нет ограниченных пользователей.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {restrictedUsers.map((u) => {
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
                        onClick={() => handleUnrestrict(uid)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg glass hover:shadow-soft cursor-pointer"
                      >
                        Отменить
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Muted accounts */}
          <div>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <VolumeX className="w-4.5 h-4.5" /> Скрытые аккаунты
            </h3>
            {mutedUsers.length === 0 ? (
              <p className="text-sm text-zinc-500">Вы никого не скрывали.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {mutedUsers.map((u) => {
                  const uid = u.id || u.userId;
                  const mt = u.muteType || "ALL";
                  return (
                    <div key={uid} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={getFullImageUrl(u.avatar || u.imagePath)}
                          name={u.userName || u.username}
                          className="w-10 h-10 border border-zinc-200 dark:border-zinc-800"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{u.userName || u.username}</span>
                          <span className="text-xs text-zinc-500">
                            {mt === "ALL" ? "Публикации и истории" : mt === "POSTS" ? "Публикации" : "Истории"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnmute(uid)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg glass hover:shadow-soft cursor-pointer"
                      >
                        Показать
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sensitive content control (#24) */}
          <div>
            <h3 className="text-base font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5" /> Контроль деликатного контента
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              Управляйте тем, как часто вы видите деликатные материалы в «Интересном» и ленте.
            </p>
            <div className="flex flex-col gap-2">
              {([
                { level: "HIDE", title: "Меньше", desc: "Скрывать деликатный контент" },
                { level: "BLUR", title: "Стандартно", desc: "Размывать деликатный контент" },
                { level: "SHOW", title: "Больше", desc: "Показывать без предупреждений" },
              ] as const).map((opt) => (
                <button
                  key={opt.level}
                  onClick={() => handleSensitiveLevel(opt.level)}
                  disabled={sensitiveBusy}
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer text-left ${
                    sensitiveLevel === opt.level
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{opt.title}</span>
                    <span className="text-xs text-zinc-500">{opt.desc}</span>
                  </div>
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${sensitiveLevel === opt.level ? "border-blue-500 bg-blue-500" : "border-zinc-300 dark:border-zinc-600"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

    </div>
  );
}
