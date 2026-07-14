"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Edit,
  Search,
  X,
  Plus,
  SmilePlus,
  StickyNote,
  Pin,
  Trash2
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
  startNewChat
} from "../../store/slices/chatsSlice";
import { api } from "../../services/api";
import { ChatsListSkeleton } from "../../components/SkeletonLoader";

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";

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

export default function InboxPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const { chats, activeChat, loading } = useSelector((state: RootState) => state.chats);

  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  const [searchUsersResults, setSearchUsersResults] = useState<any[]>([]);
  const [userSearchText, setUserSearchText] = useState("");

  // Emoji / sticker picker + reactions
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<number | null>(null);

  // Chat notes (local, per-user)
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<ChatNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteColor, setNoteColor] = useState(NOTE_COLORS[0]);
  const [noteSearch, setNoteSearch] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

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

  // Fetch full messages when selecting a chat
  const handleSelectChat = (id: number) => {
    setSelectedChatId(id);
    dispatch(selectChat(id));
    if (currentUser) {
      dispatch(fetchChatById({ chatId: id, currentUserId: currentUser.id }));
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedChatId || !currentUser) return;

    dispatch(sendMessage({
      chatId: selectedChatId,
      messageText: inputText.trim(),
      currentUserId: currentUser.id
    }));
    setInputText("");
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

  const handleCreateChat = async (receiverUserId: string) => {
    if (!currentUser) return;
    try {
      const action = await dispatch(startNewChat({ receiverUserId, currentUserId: currentUser.id }));
      if (startNewChat.fulfilled.match(action)) {
        setShowCreateChatModal(false);
        setUserSearchText("");
        setSearchUsersResults([]);
        // Load chat ID
        const newChat = action.payload;
        setSelectedChatId(newChat.id);
      }
    } catch (e) {
      console.error(e);
    }
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
          <button
            onClick={() => setShowCreateChatModal(true)}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full"
          >
            <Edit className="w-5 h-5" />
          </button>
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

        {/* Sub-tabs */}
        <div className="flex px-5 border-b border-zinc-200 dark:border-zinc-800 pb-2 gap-6 text-sm font-semibold select-none text-zinc-450 dark:text-zinc-500">
          <span className="text-black dark:text-white border-b-2 border-black dark:border-white pb-2 cursor-pointer">Основная</span>
          <span className="hover:text-zinc-650 dark:hover:text-zinc-350 cursor-pointer pb-2">Общая</span>
        </div>

        {/* Chats List */}
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
                      <img
                        src={chat.avatar}
                        alt={chat.username}
                        className="w-14 h-14 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
                      />
                      {chat.active && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-black rounded-full" />
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                      <span className="font-semibold text-sm truncate">{chat.username}</span>
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
      </div>

      {/* ----------------- ACTIVE CHAT VIEWPORT ----------------- */}
      <div className={`flex-1 flex flex-col h-full ${selectedChatId === null ? "hidden md:flex" : "flex"}`}>
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
                
                <img
                  src={activeChat.avatar}
                  alt={activeChat.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm hover:underline cursor-pointer">{activeChat.username}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{activeChat.activeStatus}</span>
                </div>
              </div>

              {/* Call & delete actions */}
              <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
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
                <button className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full press cursor-pointer">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full press cursor-pointer">
                  <Video className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteChatThread(activeChat.id)}
                  title="Delete Chat Thread"
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-full cursor-pointer"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Message Bubble Thread */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {activeChat.messages.map((msg) => {
                const isMe = msg.sender === "me";
                return (
                  <div
                    key={msg.id}
                    className={`group flex gap-3 max-w-[78%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
                  >
                    {!isMe && (
                      <img
                        src={activeChat.avatar}
                        alt={activeChat.username}
                        className="w-7 h-7 rounded-full object-cover self-end mb-1"
                      />
                    )}
                    <div className="flex flex-col gap-1 text-left min-w-0">
                      <div className="relative">
                        {msg.image ? (
                          <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-soft">
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
                  </div>
                )}
              </div>
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

      {/* ----------------- CREATE CHAT DIALOG MODAL ----------------- */}
      {showCreateChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl overflow-hidden shadow-soft-lg w-full max-w-md flex flex-col animate-pop-in">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-base">Новое сообщение</h3>
              <button
                onClick={() => {
                  setShowCreateChatModal(false);
                  setUserSearchText("");
                  setSearchUsersResults([]);
                }}
                className="hover:opacity-75"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
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
                  {userSearchText.trim() ? "Пользователи не найдены." : "Введите имя для поиска собеседника."}
                </p>
              ) : (
                searchUsersResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleCreateChat(user.id)}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatar || DEFAULT_AVATAR}
                        alt={user.userName}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                      />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm leading-none">{user.userName || user.username}</span>
                        <span className="text-xs text-zinc-450 leading-none mt-1">{user.fullName || user.name}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
