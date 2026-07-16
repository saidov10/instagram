"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import {
  Send,
  Phone,
  Video,
  Info,
  Smile,
  Image as ImageIcon,
  Heart,
  ChevronDown,
  ChevronLeft,
  Edit,
  Search,
  X,
  Plus,
  SmilePlus,
  StickyNote,
  Pin,
  Trash2,
  Music,
  Play,
  Pause,
  Mic,
  Users,
  Reply,
  Ghost,
  Check
} from "lucide-react";
import { AppDispatch, RootState } from "../../store/store";
import {
  fetchChats,
  fetchChatById,
  selectChat,
  sendMessage,
  reactToMessage,
  deleteMessage,
  deleteChat,
  startNewChat,
  startNewGroupChat,
  toggleVanishMode,
  ReplyPreview,
} from "../../store/slices/chatsSlice";
import { api, getFullImageUrl } from "../../services/api";
import { ChatsListSkeleton } from "../../components/SkeletonLoader";
import Avatar from "../../components/Avatar";
import SmartImage from "../../components/SmartImage";
import CallPanel, { CallSession, CallType, mapCall, ENV_APP_ID } from "../../components/CallPanel";
import { isOnline, formatLastSeen } from "../../lib/presence";
import MusicPicker, { MusicTrack } from "../../components/MusicPicker";

interface ChatNote {
  id: number;
  text: string;
  color: string;
  pinned: boolean;
  createdAt: number;
}

// Soft note colors (iOS-style)
const NOTE_COLORS = ["#FEF3C7", "#DBEAFE", "#FCE7F3", "#D1FAE5", "#EDE9FE", "#FFE4E6"];

// Quick reactions (iMessage / Instagram style)
const REACTIONS = ["❤️", "🔥", "😂", "😍", "👍", "👏", "😮"];

// Emoji picker set
const EMOJIS = [
  "😀", "😂", "🥹", "😍", "😎", "🥳", "😭", "😅", "🤔", "🙄",
  "😴", "🤩", "😇", "😜", "🤗", "🫶", "👍", "👏", "🙏", "💪",
  "🔥", "✨", "⭐", "💯", "❤️", "🧡", "💛", "💚", "💙", "💜",
  "🎉", "🎊", "🎁", "🌸", "🌈", "☀️", "🌙", "⚡", "💫", "🍀",
];

// Gradient "stickers" (sent as a message) — no external deps
const STICKERS = ["💖", "🔥", "🎉", "😂", "😍", "👑", "🚀", "🌟", "🍕", "☕", "🐱", "🐶"];

interface UserNote {
  id: number | string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  musicTrack?: { audioUrl: string; title: string; artist: string; durationMs: number } | null;
  isMine: boolean;
}

function VoiceMessageBubble({ url, durationMs, isMe }: { url?: string; durationMs: number; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying((p) => !p);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current || !audioRef.current.duration) return;
    setProgress(audioRef.current.currentTime / audioRef.current.duration);
  };

  const shownSeconds = playing || progress > 0 ? Math.round(totalSeconds * (1 - progress)) : totalSeconds;

  return (
    <div className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 min-w-[190px] shadow-soft ${isMe ? "btn-grad rounded-br-md" : "glass rounded-bl-md"}`}>
      <button
        onClick={toggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer ${isMe ? "bg-white/25" : "bg-black/10 dark:bg-white/15"}`}
      >
        {playing ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-0.5 h-6">
        {Array.from({ length: 24 }).map((_, i) => {
          const barActive = i / 24 <= progress;
          return (
            <span
              key={i}
              className={`w-[3px] rounded-full transition-colors ${barActive ? (isMe ? "bg-white" : "bg-[var(--accent-2)]") : isMe ? "bg-white/35" : "bg-zinc-400/50 dark:bg-zinc-600"}`}
              style={{ height: `${20 + Math.abs(Math.sin(i * 1.7)) * 60}%` }}
            />
          );
        })}
      </div>
      <span className="text-[10px] font-medium tabular-nums flex-shrink-0">0:{String(shownSeconds).padStart(2, "0")}</span>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          className="hidden"
        />
      )}
    </div>
  );
}

/** 1 участник / 2 участника / 5 участников */
function participantsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} участник`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} участника`;
  return `${count} участников`;
}

/** Avatar for a chat row/header: groups without a photo get a group glyph, not a person silhouette. */
function ChatAvatar({
  isGroup,
  avatar,
  name,
  className = "w-10 h-10",
}: {
  isGroup: boolean;
  avatar?: string;
  name?: string;
  className?: string;
}) {
  if (isGroup && !avatar) {
    return (
      <div
        className={`${className} rounded-full flex-shrink-0 flex items-center justify-center btn-grad text-white`}
        title={name}
      >
        <Users className="w-1/2 h-1/2" />
      </div>
    );
  }
  return <Avatar src={avatar} name={name} className={className} />;
}

export default function InboxPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const { chats, activeChat, loading } = useSelector((state: RootState) => state.chats);

  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Message requests (pending incoming chats)
  const [messageRequests, setMessageRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [requestBusy, setRequestBusy] = useState<Record<number, boolean>>({});
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  const [searchUsersResults, setSearchUsersResults] = useState<any[]>([]);
  const [userSearchText, setUserSearchText] = useState("");

  // Group creation (inside the same "new message" modal)
  const [createMode, setCreateMode] = useState<"direct" | "group">("direct");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupBusy, setGroupBusy] = useState(false);

  // Threaded replies
  const [replyTo, setReplyTo] = useState<ReplyPreview | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<number | null>(null);
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Vanish mode
  const [vanishBusy, setVanishBusy] = useState(false);
  const touchStartY = useRef<number | null>(null);

  // Ticks so "был(-а) в сети N минут назад" stays truthful without a refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Emoji / sticker picker + reactions
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<number | null>(null);

  // Calls (Agora)
  const [call, setCall] = useState<CallSession | null>(null);
  const [callPhase, setCallPhase] = useState<"outgoing" | "incoming" | "connected" | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  // Calls we already dismissed, so polling doesn't resurrect the incoming modal.
  const handledCallIds = useRef<Set<string>>(new Set());

  // Voice message recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

  // Chat notes (local, per-user)
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<ChatNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [noteSearch, setNoteSearch] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  // Status notes (Instagram-style, backend-backed)
  const [userNotes, setUserNotes] = useState<UserNote[]>([]);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteTrack, setNewNoteTrack] = useState<MusicTrack | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [viewingNote, setViewingNote] = useState<UserNote | null>(null);
  const noteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [noteAudioPlaying, setNoteAudioPlaying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---- Notes persistence (localStorage per user) ----
  const notesKey = currentUser ? `chat_notes_${currentUser.id}` : "chat_notes_guest";
  useEffect(() => {
    if (!currentUser) return;
    try {
      const raw = localStorage.getItem(notesKey);
      setNotes(raw ? JSON.parse(raw) : []);
    } catch {
      setNotes([]);
    }
  }, [notesKey, currentUser]);

  const persistNotes = (next: ChatNote[]) => {
    setNotes(next);
    try {
      localStorage.setItem(notesKey, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  };

  const saveNote = () => {
    const text = noteDraft.trim();
    if (!text) return;
    if (editingNoteId != null) {
      persistNotes(notes.map((n) => (n.id === editingNoteId ? { ...n, text, color: noteColor } : n)));
      setEditingNoteId(null);
    } else {
      persistNotes([{ id: Date.now(), text, color: noteColor, pinned: false, createdAt: Date.now() }, ...notes]);
    }
    setNoteDraft("");
  };

  const editNote = (n: ChatNote) => {
    setEditingNoteId(n.id);
    setNoteDraft(n.text);
    setNoteColor(n.color);
  };

  const togglePinNote = (id: number) =>
    persistNotes(notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));

  const deleteNote = (id: number) => {
    persistNotes(notes.filter((n) => n.id !== id));
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setNoteDraft("");
    }
  };

  const visibleNotes = [...notes]
    .filter((n) => n.text.toLowerCase().includes(noteSearch.trim().toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt);

  // ---- Reactions (backend-backed) ----
  const handleReact = (messageId: number, reaction: string) => {
    if (!selectedChatId) return;
    dispatch(reactToMessage({ messageId, reaction, chatId: selectedChatId }));
    setReactionMsgId(null);
  };

  // ---- Emoji / sticker send ----
  const insertEmoji = (emoji: string) => setInputText((t) => t + emoji);
  const sendSticker = (sticker: string) => {
    if (!selectedChatId || !currentUser) return;
    dispatch(sendMessage({ chatId: selectedChatId, messageText: sticker, currentUserId: currentUser.id }));
    setShowEmoji(false);
  };

  // Auto scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  // Load chat lists on load
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      dispatch(fetchChats(currentUser.id));
    }
  }, [isLoggedIn, currentUser, dispatch]);

  // ---- Message requests (pending incoming chats) ----
  const refreshRequests = () => {
    api.chat.getMessageRequests()
      .then((list) => {
        const formatted = (list || []).map((c: any) => {
          const other = c.otherUser || c.user || (c.users || []).find((u: any) => u.id !== currentUser?.id) || {};
          const last = (c.messages || [])[(c.messages || []).length - 1];
          return {
            chatId: c.id || c.chatId,
            userId: other.id || other.userId || "",
            username: other.userName || other.username || "user",
            name: other.name || other.fullName || "",
            avatar: getFullImageUrl(other.avatar || other.imagePath),
            preview: last?.messageText || last?.text || "Отправил(а) вам сообщение",
          };
        });
        setMessageRequests(formatted);
      })
      .catch(() => setMessageRequests([]));
  };

  useEffect(() => {
    if (isLoggedIn && currentUser) refreshRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, currentUser?.id]);

  const handleAcceptRequest = async (chatId: number) => {
    if (requestBusy[chatId]) return;
    setRequestBusy((p) => ({ ...p, [chatId]: true }));
    try {
      await api.chat.acceptMessageRequest(chatId);
      setMessageRequests((prev) => prev.filter((r) => r.chatId !== chatId));
      if (currentUser) dispatch(fetchChats(currentUser.id));
    } catch (err) {
      console.error("Failed to accept request:", err);
    } finally {
      setRequestBusy((p) => ({ ...p, [chatId]: false }));
    }
  };

  const handleDeclineRequest = async (chatId: number) => {
    if (requestBusy[chatId]) return;
    setRequestBusy((p) => ({ ...p, [chatId]: true }));
    try {
      await api.chat.declineMessageRequest(chatId);
      setMessageRequests((prev) => prev.filter((r) => r.chatId !== chatId));
    } catch (err) {
      console.error("Failed to decline request:", err);
    } finally {
      setRequestBusy((p) => ({ ...p, [chatId]: false }));
    }
  };

  // ---- Status notes (Instagram-style "Notes") ----
  const refreshNotes = () => {
    if (!currentUser) return;
    api.note.getNotes()
      .then((list) => {
        const formatted: UserNote[] = (list || []).map((n: any) => {
          const author = n.user || n.author || n.userProfile || {};
          const uid = author.id || author.userId || n.userId || "";
          return {
            id: n.id || n.noteId,
            userId: uid,
            username: author.userName || author.username || n.userName || "user",
            avatar: getFullImageUrl(author.avatar || author.imagePath),
            text: n.text || "",
            musicTrack: n.musicTrack || null,
            isMine: uid === currentUser.id,
          };
        });
        setUserNotes(formatted);
      })
      .catch(() => setUserNotes([]));
  };

  useEffect(() => {
    if (isLoggedIn && currentUser) refreshNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, currentUser?.id]);

  const myNote = userNotes.find((n) => n.isMine) || null;
  const friendNotes = userNotes.filter((n) => !n.isMine);

  const handleCreateNote = async () => {
    if (!newNoteText.trim()) return;
    try {
      await api.note.addNote({
        text: newNoteText.trim().slice(0, 60),
        // Send exactly the shape the note API documents — the picker's extra fields
        // (id, cover) aren't part of it.
        musicTrack: newNoteTrack
          ? {
              audioUrl: newNoteTrack.audioUrl,
              title: newNoteTrack.title,
              artist: newNoteTrack.artist,
              durationMs: newNoteTrack.durationMs,
            }
          : undefined,
      });
      setShowCreateNoteModal(false);
      setNewNoteText("");
      setNewNoteTrack(null);
      refreshNotes();
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  const handleDeleteNote = async () => {
    try {
      await api.note.deleteNote();
      setShowCreateNoteModal(false);
      refreshNotes();
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  const openNoteViewer = (note: UserNote) => {
    setViewingNote(note);
    setNoteAudioPlaying(!!note.musicTrack);
  };

  useEffect(() => {
    if (viewingNote?.musicTrack && noteAudioRef.current) {
      noteAudioRef.current.play().catch(() => {});
    }
  }, [viewingNote]);

  const toggleNoteAudio = () => {
    if (!noteAudioRef.current) return;
    if (noteAudioPlaying) {
      noteAudioRef.current.pause();
    } else {
      noteAudioRef.current.play().catch(() => {});
    }
    setNoteAudioPlaying((p) => !p);
  };

  // Fetch full messages when selecting a chat
  const handleSelectChat = (id: number) => {
    setSelectedChatId(id);
    setReplyTo(null);
    dispatch(selectChat(id));
    if (currentUser) {
      dispatch(fetchChatById({ chatId: id, currentUserId: currentUser.id }));
    }
  };

  // ---- Calls ----
  const handleStartCall = async (type: CallType) => {
    if (!activeChat || !currentUser || callBusy || call) return;
    if (!activeChat.otherUserId) {
      setCallError("В этом чате нет собеседника для звонка.");
      return;
    }
    setCallBusy(true);
    setCallError(null);
    try {
      // The backend doesn't reject a second call on top of an active one, so check ourselves
      // rather than stranding both sides in overlapping call sessions.
      const existing = mapCall(await api.chat.getActiveCall(activeChat.id).catch(() => null));
      if (existing && (existing.status === "RINGING" || existing.status === "ACCEPTED")) {
        setCallError("В этом чате уже есть активный звонок.");
        return;
      }

      const raw = await api.chat.initiateCall({
        chatId: activeChat.id,
        recipientId: activeChat.otherUserId,
        type,
      });
      const session = mapCall(raw);
      if (!session) throw new Error("Бэкенд не вернул данные звонка.");

      // Without an Agora App ID nothing can connect. Bail out here rather than ringing the
      // other side and stranding them in a call that could never join a channel.
      if (!session.appId && !ENV_APP_ID) {
        api.chat.respondToCall({ callId: session.callId, status: "ENDED" }).catch(() => {});
        setCallError(
          "Звонки не настроены: нет Agora App ID. Укажите NEXT_PUBLIC_AGORA_APP_ID в .env.local или верните appId из /Chat/initiate-call."
        );
        return;
      }

      // We deliberately do NOT block on a missing rtcToken: it's valid (null) in Agora Testing
      // mode. The token is forwarded as-is to client.join in CallPanel, which surfaces a clear
      // "temporarily unavailable" message only if the join actually fails for a token reason.

      handledCallIds.current.add(session.callId);
      setCall(session);
      setCallPhase("outgoing");
    } catch (err: any) {
      console.error("Failed to initiate call:", err);
      setCallError(err?.message || "Не удалось начать звонок.");
    } finally {
      setCallBusy(false);
    }
  };

  const closeCall = () => {
    if (call) handledCallIds.current.add(call.callId);
    setCall(null);
    setCallPhase(null);
  };

  // Mirror the call into a ref so the poller below can read it without restarting its interval.
  const callRef = useRef<CallSession | null>(null);
  useEffect(() => {
    callRef.current = call;
  }, [call]);

  // `chats` gets a fresh identity on every message, so keying the poller off the array itself would
  // restart its interval constantly. Key off the set of chat ids and read the rest through a ref.
  const chatsRef = useRef(chats);
  useEffect(() => {
    chatsRef.current = chats;
  });
  const pollableChatsKey = chats.filter((c) => !c.isGroup).map((c) => c.id).join(",");

  // Poll for call state.
  //
  // While a call is up we only watch that one chat. While idle we sweep every 1:1 chat,
  // because the backend exposes ringing calls per-chat: polling just the *open* thread meant an
  // incoming call was invisible unless the recipient happened to already have that exact chat
  // selected — which is why calls appeared not to work at all.
  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;

    const applyActiveSession = (session: CallSession | null) => {
      if (!session) {
        // The call disappeared server-side: the peer rejected or hung up.
        setCall((prev) => {
          if (!prev) return prev;
          handledCallIds.current.add(prev.callId);
          setCallPhase(null);
          return null;
        });
        return;
      }

      if (session.status === "ACCEPTED") {
        // Both sides move into the connected phase (the caller learns it here).
        setCall((prev) => (prev && prev.callId === session.callId ? { ...prev, ...session } : prev));
        setCallPhase((prev) => (prev && prev !== "connected" ? "connected" : prev));
        return;
      }

      if (session.status === "REJECTED" || session.status === "ENDED") {
        handledCallIds.current.add(session.callId);
        setCall(null);
        setCallPhase(null);
      }
    };

    const poll = async () => {
      const current = callRef.current;

      // A call is in flight — track only its chat.
      if (current) {
        try {
          const session = mapCall(await api.chat.getActiveCall(current.chatId));
          if (!cancelled) applyActiveSession(session);
        } catch {
          /* transient failure — keep the call up and retry on the next tick */
        }
        return;
      }

      // Idle — look for anyone ringing us. Groups can't host calls, so skip them.
      const candidates = chatsRef.current.filter((c) => !c.isGroup).slice(0, 20);
      for (const chat of candidates) {
        if (cancelled || callRef.current) return;
        try {
          const session = mapCall(await api.chat.getActiveCall(chat.id));
          if (cancelled || !session) continue;
          if (
            session.status === "RINGING" &&
            session.recipientId === currentUser.id &&
            !handledCallIds.current.has(session.callId)
          ) {
            setCall(session);
            setCallPhase("incoming");
            return;
          }
        } catch {
          /* no active call in this chat */
        }
      }
    };

    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [currentUser, pollableChatsKey]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedChatId || !currentUser) return;

    dispatch(sendMessage({
      chatId: selectedChatId,
      messageText: inputText.trim(),
      replyTo,
      currentUserId: currentUser.id
    }));
    setInputText("");
    setReplyTo(null);
  };

  const handleSendHeart = () => {
    if (!selectedChatId || !currentUser) return;
    dispatch(sendMessage({
      chatId: selectedChatId,
      messageText: "❤️",
      currentUserId: currentUser.id
    }));
  };

  const handleSendFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedChatId && currentUser) {
      const file = e.target.files[0];
      dispatch(sendMessage({
        chatId: selectedChatId,
        file,
        currentUserId: currentUser.id
      }));
    }
  };

  // ---- Voice message recording ----
  const clearRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!selectedChatId || !currentUser || isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecordingStream = () => {
    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordingStreamRef.current = null;
    clearRecordingTimer();
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    stopRecordingStream();
  };

  const finishRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    const durationMs = recordingSeconds * 1000;
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      audioChunksRef.current = [];
      if (selectedChatId && currentUser && blob.size > 0) {
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        dispatch(sendMessage({
          chatId: selectedChatId,
          file,
          voice: { durationMs: Math.max(1000, durationMs) },
          currentUserId: currentUser.id,
        }));
      }
    };
    mediaRecorderRef.current.stop();
    stopRecordingStream();
  };

  useEffect(() => {
    return () => {
      clearRecordingTimer();
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleSearchUsers = async (text: string) => {
    setUserSearchText(text);
    if (!text.trim()) {
      setSearchUsersResults([]);
      return;
    }
    try {
      const results = await api.user.getUsers({ userName: text });
      setSearchUsersResults(results);
    } catch (e) {
      console.error(e);
    }
  };

  const closeCreateModal = () => {
    setShowCreateChatModal(false);
    setUserSearchText("");
    setSearchUsersResults([]);
    setCreateMode("direct");
    setGroupName("");
    setGroupMembers([]);
  };

  const handleCreateChat = async (receiverUserId: string) => {
    if (!currentUser) return;
    try {
      const action = await dispatch(startNewChat({ receiverUserId, currentUserId: currentUser.id }));
      if (startNewChat.fulfilled.match(action)) {
        closeCreateModal();
        // Load chat ID
        const newChat = action.payload;
        setSelectedChatId(newChat.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleGroupMember = (user: any) => {
    const uid = user.id || user.userId;
    setGroupMembers((prev) =>
      prev.some((u) => (u.id || u.userId) === uid)
        ? prev.filter((u) => (u.id || u.userId) !== uid)
        : [...prev, user]
    );
  };

  const handleCreateGroup = async () => {
    if (!currentUser || groupBusy) return;
    const name = groupName.trim();
    const participantIds = groupMembers.map((u) => u.id || u.userId).filter(Boolean);
    if (!name || participantIds.length < 2) return;

    setGroupBusy(true);
    try {
      const action = await dispatch(startNewGroupChat({ name, participantIds, currentUserId: currentUser.id }));
      if (startNewGroupChat.fulfilled.match(action)) {
        closeCreateModal();
        setSelectedChatId(action.payload.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGroupBusy(false);
    }
  };

  // ---- Threaded replies ----
  const startReply = (msg: { id: number; text?: string; senderName?: string; sender: "me" | "them" }) => {
    setReplyTo({
      id: msg.id,
      senderId: msg.sender === "me" ? currentUser?.id || "" : activeChat?.otherUserId || "",
      senderName:
        msg.sender === "me"
          ? currentUser?.username || "Вы"
          : msg.senderName || activeChat?.username || "Пользователь",
      messageText: msg.text || "Вложение",
    });
  };

  const scrollToMessage = (messageId: number) => {
    const el = messageRefs.current[messageId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMsgId(messageId);
    setTimeout(() => setHighlightedMsgId((id) => (id === messageId ? null : id)), 1500);
  };

  // ---- Vanish mode ----
  const handleToggleVanish = async () => {
    if (!activeChat || !currentUser || vanishBusy) return;
    const next = !activeChat.isVanishMode;
    setVanishBusy(true);
    try {
      await dispatch(toggleVanishMode({ chatId: activeChat.id, isVanishMode: next })).unwrap();
      // The backend wipes already-read messages on read; refetch so the thread
      // reflects what actually survives server-side rather than a stale copy.
      dispatch(fetchChatById({ chatId: activeChat.id, currentUserId: currentUser.id }));
    } catch (e) {
      console.error("Failed to toggle vanish mode:", e);
    } finally {
      setVanishBusy(false);
    }
  };

  // Swipe up inside the thread toggles vanish mode (Instagram's gesture).
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startY = touchStartY.current;
    touchStartY.current = null;
    if (startY == null) return;
    const endY = e.changedTouches[0]?.clientY;
    if (endY == null) return;
    if (startY - endY > 90) handleToggleVanish();
  };

  const handleDeleteChatThread = async (id: number) => {
    try {
      if (window.confirm("Удалить этот чат?")) {
        await dispatch(deleteChat(id)).unwrap();
        setSelectedChatId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex h-[calc(100vh-64px)] md:h-screen transition-colors duration-200">

      {/* ----------------- CHATS SIDEBAR ----------------- */}
      <div className={`w-full md:w-96 glass flex flex-col ${selectedChatId !== null ? "hidden md:flex" : "flex"}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <button className="flex items-center gap-2 font-bold text-xl hover:text-zinc-600 dark:hover:text-zinc-300">
            {currentUser?.username || "Сообщения"}
            <ChevronDown className="w-5 h-5 text-zinc-500" />
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setCreateMode("group");
                setShowCreateChatModal(true);
              }}
              title="Создать группу"
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer"
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setCreateMode("direct");
                setShowCreateChatModal(true);
              }}
              title="Новое сообщение"
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mb-4">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Поиск"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 outline-none rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        {/* Status Notes strip */}
        <div className="flex gap-4 px-5 pt-9 pb-4 overflow-x-auto no-scrollbar">
          {currentUser && (
            <button
              onClick={() => {
                if (myNote) {
                  openNoteViewer(myNote);
                } else {
                  setNewNoteText("");
                  setNewNoteTrack(null);
                  setShowCreateNoteModal(true);
                }
              }}
              className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
            >
              <div className="relative">
                {myNote && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 glass-strong rounded-2xl rounded-bl-sm px-2.5 py-1 whitespace-nowrap max-w-[110px] truncate text-[11px] font-medium shadow-soft">
                    {myNote.text}
                  </div>
                )}
                <Avatar src={getFullImageUrl(currentUser.avatar)} name={currentUser.username} className="w-12 h-12 border-2 border-zinc-200 dark:border-zinc-800 group-hover:scale-105 transition" alt="Your note" />
                <div className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-blue-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-white text-[10px] font-bold">
                  {myNote ? <Edit className="w-2.5 h-2.5" /> : "+"}
                </div>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[64px] truncate">Заметка</span>
            </button>
          )}
          {friendNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => openNoteViewer(note)}
              className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer group"
            >
              <div className="relative">
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 glass-strong rounded-2xl rounded-bl-sm px-2.5 py-1 whitespace-nowrap max-w-[110px] truncate text-[11px] font-medium shadow-soft">
                  {note.text}
                </div>
                <Avatar src={note.avatar} name={note.username} className="w-12 h-12 border-2 border-transparent group-hover:scale-105 transition gradient-ring p-[2px]" />
                {note.musicTrack && (
                  <div className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-black rounded-full border-2 border-white dark:border-black flex items-center justify-center">
                    <Music className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[64px] truncate">{note.username}</span>
            </button>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center justify-between px-5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <div className="flex gap-6 text-sm font-semibold select-none text-zinc-450 dark:text-zinc-500">
            <span className="text-black dark:text-white border-b-2 border-black dark:border-white pb-2 cursor-pointer">Основная</span>
            <span className="hover:text-zinc-650 dark:hover:text-zinc-350 cursor-pointer pb-2">Общая</span>
          </div>
        </div>

        {/* Message-requests banner */}
        {messageRequests.length > 0 && !showRequests && (
          <button
            onClick={() => setShowRequests(true)}
            className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition cursor-pointer border-b border-zinc-100 dark:border-zinc-900"
          >
            <span className="font-semibold text-sm">Запросы на переписку</span>
            <span className="text-xs font-bold text-blue-500">
              {messageRequests.length} {messageRequests.length === 1 ? "запрос" : "запросов"}
            </span>
          </button>
        )}

        {/* Requests list view */}
        {showRequests ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-100 dark:border-zinc-900">
              <button onClick={() => setShowRequests(false)} className="hover:opacity-60 cursor-pointer">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-sm">Запросы на переписку</span>
            </div>
            {messageRequests.length === 0 ? (
              <div className="text-center p-8 text-zinc-450 dark:text-zinc-500 text-sm">Новых запросов нет.</div>
            ) : (
              messageRequests.map((req) => (
                <div key={req.chatId} className="flex items-center gap-3 p-4 px-5 border-b border-zinc-50 dark:border-zinc-900/60">
                  <Link href={req.userId ? `/u/${req.userId}` : "#"} className="flex-shrink-0">
                    <Avatar src={req.avatar} name={req.username} className="w-12 h-12" />
                  </Link>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-sm truncate">{req.username}</span>
                    <span className="text-xs text-zinc-450 truncate">{req.preview}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAcceptRequest(req.chatId)}
                      disabled={requestBusy[req.chatId]}
                      className="text-xs font-bold btn-grad text-white px-3 py-1.5 rounded-lg hover:opacity-90 cursor-pointer disabled:opacity-50"
                    >
                      Принять
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req.chatId)}
                      disabled={requestBusy[req.chatId]}
                      className="text-xs font-bold glass px-3 py-1.5 rounded-lg hover:shadow-soft cursor-pointer disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
        /* Chats List */
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <ChatsListSkeleton />
          ) : filteredChats.length === 0 ? (
            <div className="text-center p-8 text-zinc-450 dark:text-zinc-500 text-sm">Чаты не найдены.</div>
          ) : (
            filteredChats.map((chat) => {
              const lastMsg = chat.messages[chat.messages.length - 1];
              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`flex items-center justify-between p-4 px-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 cursor-pointer transition ${
                    selectedChatId === chat.id ? "bg-zinc-100 dark:bg-zinc-900" : ""
                  }`}
                >
                  <div className="flex items-center gap-4.5 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <ChatAvatar
                        isGroup={chat.isGroup}
                        avatar={chat.avatar}
                        name={chat.username}
                        className="w-14 h-14 border border-zinc-200 dark:border-zinc-800"
                      />
                      {!chat.isGroup && isOnline(chat.lastSeenAt, now) && (
                        <span
                          title="В сети"
                          className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-black rounded-full"
                        />
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                      <span className="font-semibold text-sm truncate flex items-center gap-1.5">
                        {chat.username}
                        {chat.isGroup && <Users className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />}
                      </span>
                      <span className={`text-xs truncate ${chat.unread ? "font-bold text-black dark:text-white" : "text-zinc-400 dark:text-zinc-500"}`}>
                        {lastMsg?.image ? "Отправил(-а) вложение" : lastMsg?.text || "Начата беседа"}
                        {lastMsg && (
                          <>
                            <span className="mx-1">•</span>
                            {lastMsg.time}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Unread circle badge */}
                  {chat.unread && (
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
        )}
      </div>

      {/* ----------------- ACTIVE CHAT VIEWPORT ----------------- */}
      <div
        className={`flex-1 flex flex-col h-full relative transition-colors duration-300 ${
          selectedChatId === null ? "hidden md:flex" : "flex"
        } ${activeChat?.isVanishMode ? "vanish-mode" : ""}`}
      >
        {activeChat ? (
          <>
            {/* Header info */}
            <div className="flex items-center justify-between p-4 px-6 glass sticky top-0 z-10 text-left">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedChatId(null)}
                  className="md:hidden p-1 mr-1 hover:bg-zinc-150 dark:hover:bg-zinc-900 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {!activeChat.isGroup && activeChat.otherUserId ? (
                  <Link href={`/u/${activeChat.otherUserId}`} className="relative flex-shrink-0">
                    <ChatAvatar
                      isGroup={activeChat.isGroup}
                      avatar={activeChat.avatar}
                      name={activeChat.username}
                      className="w-10 h-10 hover:opacity-90 transition"
                    />
                    {isOnline(activeChat.lastSeenAt, now) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-black rounded-full" />
                    )}
                  </Link>
                ) : (
                  <div className="relative flex-shrink-0">
                    <ChatAvatar
                      isGroup={activeChat.isGroup}
                      avatar={activeChat.avatar}
                      name={activeChat.username}
                      className="w-10 h-10"
                    />
                    {!activeChat.isGroup && isOnline(activeChat.lastSeenAt, now) && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-black rounded-full" />
                    )}
                  </div>
                )}
                <div className="flex flex-col">
                  {!activeChat.isGroup && activeChat.otherUserId ? (
                    <Link href={`/u/${activeChat.otherUserId}`}>
                      <span className="font-semibold text-sm hover:underline cursor-pointer">{activeChat.username}</span>
                    </Link>
                  ) : (
                    <span className="font-semibold text-sm">{activeChat.username}</span>
                  )}
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                    {activeChat.isGroup
                      ? participantsLabel(activeChat.groupInfo?.participantsCount || 0)
                      : formatLastSeen(activeChat.lastSeenAt, now)}
                  </span>
                </div>
              </div>

              {/* Call & delete actions */}
              <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                <button
                  onClick={handleToggleVanish}
                  disabled={vanishBusy}
                  title={activeChat.isVanishMode ? "Выключить исчезающий режим" : "Включить исчезающий режим"}
                  className={`p-2 rounded-full press cursor-pointer disabled:opacity-40 ${
                    activeChat.isVanishMode
                      ? "bg-white/15 text-white"
                      : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <Ghost className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowNotes(true)}
                  title="Заметки"
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full press cursor-pointer relative"
                >
                  <StickyNote className="w-5 h-5" />
                  {notes.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full gradient-bg" />
                  )}
                </button>
                {/* Calls are 1:1 only — a group has no single recipient to ring. */}
                {!activeChat.isGroup && (
                  <>
                    <button
                      onClick={() => handleStartCall("AUDIO")}
                      disabled={callBusy || !!call}
                      title="Аудиозвонок"
                      className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full press cursor-pointer disabled:opacity-40"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleStartCall("VIDEO")}
                      disabled={callBusy || !!call}
                      title="Видеозвонок"
                      className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full press cursor-pointer disabled:opacity-40"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDeleteChatThread(activeChat.id)}
                  title="Delete Chat Thread"
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-full cursor-pointer"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Call failure banner — these used to die silently in the console */}
            {callError && (
              <div className="mx-6 mt-3 flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-500 animate-in fade-in duration-200">
                <span className="flex-1">{callError}</span>
                <button
                  onClick={() => setCallError(null)}
                  className="p-0.5 hover:opacity-70 cursor-pointer flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Bubble Thread */}
            <div
              className="flex-1 overflow-y-auto p-6 flex flex-col gap-3 relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Vanish-mode ambience: falling spies + a hint about the gesture */}
              {activeChat.isVanishMode && (
                <>
                  <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <span
                        key={i}
                        className="vanish-spy"
                        style={{
                          left: `${(i * 8.5 + 4) % 96}%`,
                          animationDuration: `${7 + (i % 5) * 2}s`,
                          animationDelay: `${(i % 6) * 1.2}s`,
                        }}
                      >
                        {i % 2 === 0 ? "🕵️" : "👻"}
                      </span>
                    ))}
                  </div>
                  <div className="sticky top-0 z-10 self-center glass rounded-full px-4 py-1.5 text-[11px] font-semibold flex items-center gap-2">
                    <Ghost className="w-3.5 h-3.5" />
                    Исчезающий режим включён — сообщения удалятся после прочтения
                  </div>
                </>
              )}

              {activeChat.messages.map((msg) => {
                const isMe = msg.sender === "me";
                return (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      messageRefs.current[msg.id] = el;
                    }}
                    className={`group flex gap-3 max-w-[78%] z-1 rounded-2xl transition-shadow duration-500 ${
                      isMe ? "self-end flex-row-reverse" : "self-start"
                    } ${highlightedMsgId === msg.id ? "ring-2 ring-[var(--accent-2)] ring-offset-2 ring-offset-transparent" : ""}`}
                  >
                    {!isMe && (
                      <Avatar
                        src={activeChat.isGroup ? msg.senderAvatar : activeChat.avatar}
                        name={msg.senderName || activeChat.username}
                        className="w-7 h-7 self-end mb-1"
                      />
                    )}
                    <div className="flex flex-col gap-1 text-left min-w-0">
                      {/* Who said it — only ambiguous in a group */}
                      {activeChat.isGroup && !isMe && msg.senderName && (
                        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 px-1">
                          {msg.senderName}
                        </span>
                      )}

                      {/* Quoted original — click scrolls the thread to it */}
                      {msg.replyTo && (
                        <button
                          type="button"
                          onClick={() => scrollToMessage(msg.replyTo!.id)}
                          className={`flex flex-col gap-0.5 text-left rounded-xl px-3 py-1.5 border-l-2 border-[var(--accent-2)] max-w-full cursor-pointer hover:opacity-80 transition ${
                            isMe ? "bg-black/10 dark:bg-white/10" : "bg-black/5 dark:bg-white/5"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-[var(--accent-2)] truncate">
                            {msg.replyTo.senderName}
                          </span>
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate max-w-[220px]">
                            {msg.replyTo.messageText || "Вложение"}
                          </span>
                        </button>
                      )}

                      <div className="relative">
                        {msg.isVoice ? (
                          <VoiceMessageBubble url={msg.voiceUrl} durationMs={msg.durationMs || 0} isMe={isMe} />
                        ) : msg.image ? (
                          <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-soft">
                            {/* eslint-disable-next-line @next/next/no-img-element -- chat attachment keeps the sender's natural aspect ratio, unknown for remote images */}
                            <img src={msg.image} alt="Attachment" className="max-w-full h-auto object-cover max-h-60" />
                          </div>
                        ) : (
                          <div
                            className={`rounded-2xl px-4 py-2.5 text-sm select-text break-words shadow-soft ${
                              isMe
                                ? "btn-grad rounded-br-md"
                                : "glass rounded-bl-md text-zinc-900 dark:text-zinc-100"
                            }`}
                          >
                            {msg.text}
                          </div>
                        )}

                        {/* Reaction badge on the bubble */}
                        {msg.reaction && (
                          <span className={`absolute -bottom-2.5 ${isMe ? "left-1" : "right-1"} glass-strong rounded-full text-xs px-1.5 py-0.5 shadow-soft animate-pop-in`}>
                            {msg.reaction}
                          </span>
                        )}

                        {/* Hover actions: react + delete */}
                        <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "right-full mr-2" : "left-full ml-2"} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition`}>
                          <button
                            onClick={() => startReply(msg)}
                            className="p-1.5 glass rounded-full press hover:shadow-soft cursor-pointer"
                            title="Ответить"
                          >
                            <Reply className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setReactionMsgId(reactionMsgId === msg.id ? null : msg.id)}
                            className="p-1.5 glass rounded-full press hover:shadow-soft cursor-pointer"
                            title="Реакция"
                          >
                            <SmilePlus className="w-4 h-4" />
                          </button>
                          {isMe && (
                            <button
                              onClick={() => dispatch(deleteMessage({ messageId: msg.id, chatId: activeChat.id }))}
                              className="p-1.5 glass rounded-full press hover:shadow-soft text-red-500 cursor-pointer"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Reaction picker popover */}
                        {reactionMsgId === msg.id && (
                          <div className={`absolute z-20 -top-11 ${isMe ? "right-0" : "left-0"} glass-strong rounded-full px-2 py-1.5 flex items-center gap-1 shadow-soft-lg animate-pop-in`}>
                            {REACTIONS.map((r) => (
                              <button
                                key={r}
                                onClick={() => handleReact(msg.id, r)}
                                className="text-lg leading-none hover:scale-125 transition-transform cursor-pointer"
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`text-[9px] text-zinc-400 select-none ${isMe ? "text-right" : "text-left"} ${msg.reaction ? "mt-2" : ""}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4">
              {showEmoji && (
                <div className="mb-3 glass-strong rounded-3xl p-3 shadow-soft-lg animate-in slide-in-from-bottom-2 duration-200 max-h-64 overflow-y-auto no-scrollbar">
                  <div className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 mb-2 px-1">Стикеры</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {STICKERS.map((s) => (
                      <button key={s} type="button" onClick={() => sendSticker(s)} className="text-3xl press hover:scale-110 transition">
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 mb-2 px-1">Эмодзи</div>
                  <div className="grid grid-cols-10 gap-1">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => insertEmoji(e)}
                        className="text-xl p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:scale-110 transition"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Reply composer preview */}
              {replyTo && (
                <div className="mb-2 flex items-center gap-3 glass rounded-2xl px-4 py-2.5 shadow-soft animate-in slide-in-from-bottom-2 duration-200">
                  <Reply className="w-4 h-4 text-[var(--accent-2)] flex-shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1 border-l-2 border-[var(--accent-2)] pl-3">
                    <span className="text-[11px] font-bold text-[var(--accent-2)] truncate">
                      Ответ · {replyTo.senderName}
                    </span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
                      {replyTo.messageText}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    title="Отменить ответ"
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full cursor-pointer flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isRecording ? (
                <div className="flex items-center gap-4 glass rounded-full px-4 py-2.5 shadow-soft">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="text-red-500 hover:text-red-400 cursor-pointer flex-shrink-0"
                    title="Отменить"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="flex-1 flex items-center gap-0.5 h-6 overflow-hidden">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-red-500 flex-shrink-0 animate-pulse"
                        style={{
                          height: `${20 + Math.abs(Math.sin((i + recordingSeconds * 3) * 1.3)) * 70}%`,
                          animationDelay: `${i * 30}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-red-500 flex-shrink-0">
                    0:{String(recordingSeconds).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={finishRecording}
                    className="w-9 h-9 rounded-full btn-grad flex items-center justify-center flex-shrink-0 cursor-pointer"
                    title="Отправить"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
              <div className="flex items-center gap-4 glass rounded-full px-4 py-2.5 shadow-soft">
                <button
                  type="button"
                  onClick={() => setShowEmoji((v) => !v)}
                  className={`cursor-pointer transition press ${showEmoji ? "text-[var(--accent-2)]" : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-550"}`}
                >
                  <Smile className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Напишите сообщение..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="bg-transparent text-sm w-full outline-none placeholder-zinc-450 text-zinc-900 dark:text-white"
                />

                {inputText.trim() ? (
                  <button type="submit" className="text-blue-500 font-semibold text-sm hover:text-blue-650 px-1 animate-in fade-in duration-200 cursor-pointer">
                    Отправить
                  </button>
                ) : (
                  <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="hover:text-zinc-500 cursor-pointer"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleSendFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button type="button" onClick={handleSendHeart} className="hover:text-red-500 hover:scale-105 active:scale-95 transition cursor-pointer">
                      <Heart className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={startRecording} className="hover:text-[var(--accent-2)] hover:scale-105 active:scale-95 transition cursor-pointer">
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              )}
            </form>
          </>
        ) : (
          /* Empty Chat View */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-zinc-50/50 dark:bg-black/50 select-none">
            <div className="w-24 h-24 rounded-full border-2 border-black dark:border-white flex items-center justify-center mb-6 relative">
              <div className="absolute inset-1.5 rounded-full border border-black/40 dark:border-white/40" />
              <svg className="w-10 h-10 text-black dark:text-white fill-none stroke-[1.2px]" viewBox="0 0 24 24" stroke="currentColor">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Ваши сообщения</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 max-w-xs leading-relaxed">
              Отправляйте личные фото и сообщения другу или группе.
            </p>
            <button
              onClick={() => setShowCreateChatModal(true)}
              className="bg-blue-500 hover:bg-blue-650 active:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition cursor-pointer"
            >
              Отправить сообщение
            </button>
          </div>
        )}
      </div>

      {/* ----------------- CHAT NOTES DRAWER ----------------- */}
      {showNotes && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowNotes(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative glass-strong w-full max-w-sm h-full flex flex-col shadow-soft-lg animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <StickyNote className="w-5 h-5" /> Заметки
              </h3>
              <button onClick={() => setShowNotes(false)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Composer */}
            <div className="p-4 flex flex-col gap-3 border-b border-[var(--border)]">
              <textarea
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={editingNoteId != null ? "Редактировать заметку..." : "Новая заметка..."}
                className="w-full rounded-2xl px-3 py-2.5 text-sm resize-none outline-none text-zinc-900 shadow-soft"
                style={{ background: noteColor }}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNoteColor(c)}
                      className={`w-6 h-6 rounded-full press border-2 transition ${noteColor === c ? "border-zinc-800 dark:border-white scale-110" : "border-transparent"}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <button
                  onClick={saveNote}
                  disabled={!noteDraft.trim()}
                  className="btn-grad px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer"
                >
                  {editingNoteId != null ? "Сохранить" : "Добавить"}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 py-3">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
                <input
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  placeholder="Поиск по заметкам"
                  className="w-full glass rounded-xl pl-9 pr-3 py-2 text-sm outline-none text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3 no-scrollbar">
              {visibleNotes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-400 gap-2 py-10">
                  <StickyNote className="w-9 h-9 stroke-[1.4px]" />
                  <span className="text-sm">{noteSearch ? "Ничего не найдено." : "Заметок пока нет."}</span>
                </div>
              ) : (
                visibleNotes.map((n) => (
                  <div key={n.id} className="rounded-2xl p-3 shadow-soft text-zinc-900 relative group" style={{ background: n.color }}>
                    {n.pinned && <Pin className="absolute top-2 right-2 w-3.5 h-3.5 fill-zinc-700 text-zinc-700" />}
                    <p className="text-sm whitespace-pre-wrap break-words pr-5">{n.text}</p>
                    <div className="flex items-center gap-3 mt-2 text-zinc-600 text-xs">
                      <button onClick={() => togglePinNote(n.id)} className="hover:text-zinc-900 cursor-pointer flex items-center gap-1">
                        <Pin className="w-3.5 h-3.5" /> {n.pinned ? "Открепить" : "Закрепить"}
                      </button>
                      <button onClick={() => editNote(n)} className="hover:text-zinc-900 cursor-pointer flex items-center gap-1">
                        <Edit className="w-3.5 h-3.5" /> Изменить
                      </button>
                      <button onClick={() => deleteNote(n.id)} className="hover:text-red-600 cursor-pointer flex items-center gap-1 ml-auto">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- CREATE / EDIT STATUS NOTE MODAL ----------------- */}
      {showCreateNoteModal && currentUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateNoteModal(false)}>
          <div
            className="glass-strong rounded-3xl overflow-hidden shadow-soft-lg w-full max-w-sm flex flex-col animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="font-bold text-base">Заметка</h3>
              <button onClick={() => setShowCreateNoteModal(false)} className="hover:opacity-75 cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar src={getFullImageUrl(currentUser.avatar)} name={currentUser.username} className="w-10 h-10" />
                <div className="flex-1 relative">
                  <textarea
                    autoFocus
                    rows={2}
                    maxLength={60}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value.slice(0, 60))}
                    placeholder="Поделитесь мыслями..."
                    className="w-full glass rounded-2xl px-3.5 py-2.5 text-sm resize-none outline-none text-zinc-900 dark:text-white"
                  />
                  <span className="absolute bottom-1.5 right-3 text-[10px] text-zinc-400">{newNoteText.length}/60</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> Музыка (опционально)
                </span>

                {newNoteTrack ? (
                  <div className="flex items-center gap-3 glass rounded-2xl p-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                      {newNoteTrack.coverUrl ? (
                        <SmartImage src={newNoteTrack.coverUrl} alt="" width={80} height={80} sizes="40px" unoptimized className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold truncate">{newNoteTrack.title}</span>
                      <span className="text-[10px] text-zinc-450 truncate">{newNoteTrack.artist}</span>
                    </div>
                    <button
                      onClick={() => setShowMusicPicker(true)}
                      className="text-[11px] font-bold text-blue-500 hover:text-blue-600 cursor-pointer flex-shrink-0"
                    >
                      Заменить
                    </button>
                    <button
                      onClick={() => setNewNoteTrack(null)}
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
              </div>

              <div className="flex items-center gap-2">
                {myNote && (
                  <button
                    onClick={handleDeleteNote}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-red-500 glass hover:shadow-soft cursor-pointer"
                  >
                    Удалить заметку
                  </button>
                )}
                <button
                  onClick={handleCreateNote}
                  disabled={!newNoteText.trim()}
                  className="flex-1 btn-grad py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer"
                >
                  Поделиться
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MUSIC PICKER (notes) ----------------- */}
      {showMusicPicker && (
        <MusicPicker
          onSelect={(track) => setNewNoteTrack(track)}
          onClose={() => setShowMusicPicker(false)}
        />
      )}

      {/* ----------------- VIEW STATUS NOTE MODAL ----------------- */}
      {viewingNote && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setViewingNote(null); noteAudioRef.current?.pause(); }}
        >
          <div className="glass-strong rounded-3xl shadow-soft-lg w-full max-w-xs flex flex-col items-center gap-4 p-6 animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <Avatar src={viewingNote.avatar} name={viewingNote.username} className="w-16 h-16 border-2 border-zinc-200 dark:border-zinc-800" />
            <span className="font-bold text-sm">{viewingNote.username}</span>
            <div className="glass rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-center max-w-full break-words">
              {viewingNote.text}
            </div>
            {viewingNote.musicTrack && (
              <div className="flex items-center gap-3 w-full glass rounded-2xl p-3">
                <button
                  onClick={toggleNoteAudio}
                  className="w-9 h-9 rounded-full btn-grad flex items-center justify-center flex-shrink-0 cursor-pointer"
                >
                  {noteAudioPlaying ? <Pause className="w-4 h-4 text-white fill-white" /> : <Play className="w-4 h-4 text-white fill-white ml-0.5" />}
                </button>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate">{viewingNote.musicTrack.title}</span>
                  <span className="text-[10px] text-zinc-450 truncate">{viewingNote.musicTrack.artist}</span>
                </div>
                <audio
                  ref={noteAudioRef}
                  src={viewingNote.musicTrack.audioUrl}
                  onEnded={() => setNoteAudioPlaying(false)}
                  className="hidden"
                />
              </div>
            )}
            {viewingNote.isMine && (
              <div className="flex flex-col gap-2 w-full mt-2 animate-in fade-in duration-200">
                <button
                  onClick={() => {
                    setViewingNote(null);
                    noteAudioRef.current?.pause();
                    setNewNoteText(myNote?.text || "");
                    setNewNoteTrack(myNote?.musicTrack ? {
                      id: "",
                      title: myNote.musicTrack.title,
                      artist: myNote.musicTrack.artist,
                      audioUrl: myNote.musicTrack.audioUrl,
                      durationMs: myNote.musicTrack.durationMs,
                      coverUrl: ""
                    } : null);
                    setShowCreateNoteModal(true);
                  }}
                  className="w-full btn-grad py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-soft hover:shadow-soft-lg"
                >
                  Оставить новую заметку
                </button>
                <button
                  onClick={() => {
                    setViewingNote(null);
                    noteAudioRef.current?.pause();
                    handleDeleteNote();
                  }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-soft"
                >
                  Удалить заметку
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- CREATE CHAT DIALOG MODAL ----------------- */}
      {showCreateChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl overflow-hidden shadow-soft-lg w-full max-w-md flex flex-col animate-pop-in">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-base">
                {createMode === "group" ? "Новая группа" : "Новое сообщение"}
              </h3>
              <button onClick={closeCreateModal} className="hover:opacity-75 cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mode switch */}
            <div className="flex gap-2 p-3 border-b border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setCreateMode("direct")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer transition ${
                  createMode === "direct" ? "btn-grad text-white" : "glass hover:shadow-soft"
                }`}
              >
                Личный чат
              </button>
              <button
                onClick={() => setCreateMode("group")}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer transition flex items-center justify-center gap-2 ${
                  createMode === "group" ? "btn-grad text-white" : "glass hover:shadow-soft"
                }`}
              >
                <Users className="w-4 h-4" />
                Создать группу
              </button>
            </div>

            {/* Group name + selected chips */}
            {createMode === "group" && (
              <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-2.5">
                <input
                  type="text"
                  placeholder="Название группы (например, Avengers)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full glass rounded-xl px-3 py-2.5 text-sm outline-none text-zinc-900 dark:text-white"
                />
                {groupMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {groupMembers.map((u) => {
                      const uid = u.id || u.userId;
                      return (
                        <span
                          key={uid}
                          className="flex items-center gap-1.5 glass rounded-full pl-1 pr-2 py-1 text-xs font-semibold"
                        >
                          <Avatar
                            src={getFullImageUrl(u.avatar || u.imagePath)}
                            name={u.userName || u.username}
                            className="w-5 h-5"
                          />
                          {u.userName || u.username}
                          <button
                            onClick={() => toggleGroupMember(u)}
                            className="hover:text-red-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Search Input */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-550 dark:text-zinc-400">Кому:</span>
              <input
                type="text"
                placeholder="Поиск..."
                value={userSearchText}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm p-1 ring-0"
              />
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto max-h-[300px] p-2 flex flex-col gap-1.5">
              {searchUsersResults.length === 0 ? (
                <p className="text-zinc-450 dark:text-zinc-500 text-sm text-center py-10">
                  {userSearchText.trim()
                    ? "Пользователи не найдены."
                    : createMode === "group"
                    ? "Найдите и отметьте участников группы."
                    : "Введите имя для поиска собеседника."}
                </p>
              ) : (
                searchUsersResults
                  .filter((user) => (user.id || user.userId) !== currentUser?.id)
                  .map((user) => {
                    const uid = user.id || user.userId;
                    const checked = groupMembers.some((u) => (u.id || u.userId) === uid);
                    return (
                      <div
                        key={uid}
                        onClick={() =>
                          createMode === "group" ? toggleGroupMember(user) : handleCreateChat(uid)
                        }
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={getFullImageUrl(user.avatar || user.imagePath)}
                            name={user.userName}
                            className="w-10 h-10 border border-zinc-200 dark:border-zinc-800"
                          />
                          <div className="flex flex-col text-left min-w-0">
                            <span className="font-bold text-sm leading-none truncate">
                              {user.userName || user.username}
                            </span>
                            <span className="text-xs text-zinc-450 leading-none mt-1 truncate">
                              {user.fullName || user.name}
                            </span>
                          </div>
                        </div>

                        {createMode === "group" && (
                          <span
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 transition ${
                              checked
                                ? "btn-grad border-transparent text-white"
                                : "border-zinc-300 dark:border-zinc-600"
                            }`}
                          >
                            {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                          </span>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Create group action */}
            {createMode === "group" && (
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <span className="text-xs text-zinc-450 flex-1">
                  {groupMembers.length < 2
                    ? "Выберите минимум 2 участника."
                    : `Выбрано: ${groupMembers.length}`}
                </span>
                <button
                  onClick={handleCreateGroup}
                  disabled={groupBusy || !groupName.trim() || groupMembers.length < 2}
                  className="btn-grad px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer flex-shrink-0"
                >
                  {groupBusy ? "Создание..." : "Создать"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- CALL PANEL (outgoing / incoming / connected) ----------------- */}
      {call && callPhase && (
        <CallPanel
          call={call}
          phase={callPhase}
          peerName={chats.find((c) => c.id === call.chatId)?.username || activeChat?.username || "Пользователь"}
          peerAvatar={chats.find((c) => c.id === call.chatId)?.avatar || activeChat?.avatar}
          onAccepted={(session) => {
            // Merge in the fresh session from the ACCEPTED response — it carries the rtcToken
            // actually usable for joining, which the RINGING snapshot may have lacked.
            setCall((prev) => (prev ? { ...prev, ...session } : session));
            setCallPhase("connected");
          }}
          onEnded={closeCall}
        />
      )}

    </div>
  );
}
