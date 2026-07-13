"use client";

import React, { useState, useRef, useEffect } from "react";
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
  MessageSquare,
  Plus
} from "lucide-react";
import { useApp } from "../../context/AppContext";

interface ChatMessage {
  id: number;
  sender: "me" | "them";
  text?: string;
  image?: string;
  time: string;
}

interface Chat {
  id: number;
  username: string;
  name: string;
  avatar: string;
  active: boolean;
  activeStatus: string;
  unread: boolean;
  messages: ChatMessage[];
}

export default function InboxPage() {
  const { currentUser } = useApp();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [chats, setChats] = useState<Chat[]>([
    {
      id: 1,
      username: "-Next.js ))",
      name: "Next.js Group",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      active: true,
      activeStatus: "В сети: 55 мин. назад",
      unread: true,
      messages: [
        { id: 1, sender: "them", text: "Привет! Как продвигается проект?", time: "Вчера" },
        { id: 2, sender: "me", text: "Все отлично, пишем дизайн-систему на Next.js.", time: "Вчера" },
        { id: 3, sender: "them", text: "ghost_11_44 отправил(-а) реакцию", time: "55 мин." }
      ]
    },
    {
      id: 2,
      username: "DNA",
      name: "DNA Genetics",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      active: false,
      activeStatus: "В сети: 3 ч. назад",
      unread: false,
      messages: [
        { id: 1, sender: "me", text: "Реакция на ваше сообщение: Haha", time: "3 ч." }
      ]
    },
    {
      id: 3,
      username: "one family",
      name: "Family Room",
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop",
      active: true,
      activeStatus: "В сети сегодня: 2",
      unread: false,
      messages: [
        { id: 1, sender: "them", text: "В сети сегодня: 2", time: "4 ч." }
      ]
    },
    {
      id: 4,
      username: "diamond",
      name: "Diamond",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      active: false,
      activeStatus: "В сети: 5 ч. назад",
      unread: false,
      messages: [
        { id: 1, sender: "them", text: "Привет! Есть свободная минутка?", time: "5 ч." }
      ]
    }
  ]);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  // Auto scroll messages to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages]);

  const handleSelectChat = (id: number) => {
    setSelectedChatId(id);
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: false } : c))
    );
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedChatId) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      sender: "me",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === selectedChatId) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage]
          };
        }
        return chat;
      })
    );

    const tempText = inputText;
    setInputText("");

    // Simulate automatic reply after 1.5 seconds
    setTimeout(() => {
      const replyMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: "them",
        text: `Awesome! Let's talk about it soon.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === selectedChatId) {
            return {
              ...chat,
              messages: [...chat.messages, replyMessage]
            };
          }
          return chat;
        })
      );
    }, 1500);
  };

  const handleSendHeart = () => {
    if (!selectedChatId) return;
    const newMessage: ChatMessage = {
      id: Date.now(),
      sender: "me",
      text: "❤️",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === selectedChatId) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage]
          };
        }
        return chat;
      })
    );
  };

  const filteredChats = chats.filter((c) =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex bg-white dark:bg-black h-[calc(100vh-64px)] md:h-screen transition-colors duration-200">
      
      {/* ----------------- CHATS SIDEBAR ----------------- */}
      <div className={`w-full md:w-96 border-r border-zinc-200 dark:border-zinc-800 flex flex-col ${selectedChatId !== null ? "hidden md:flex" : "flex"}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3">
          <button className="flex items-center gap-2 font-bold text-xl hover:text-zinc-600 dark:hover:text-zinc-300">
            {currentUser.username}
            <ChevronDown className="w-5 h-5 text-zinc-500" />
          </button>
          <button className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full">
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
              className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 outline-none rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>
        </div>

        {/* Notes Tray */}
        <div className="px-5 mb-5 flex gap-4 overflow-x-auto no-scrollbar py-2 select-none border-b border-zinc-100 dark:border-zinc-900/60 pb-4">
          {/* User's note */}
          <div className="flex flex-col items-center flex-shrink-0 cursor-pointer relative group">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
              />
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-[70px] truncate text-[9px] text-zinc-400 text-center">
                Оставить
              </div>
              <div className="absolute bottom-0 right-0 bg-[#0095f6] text-white rounded-full p-0.5 border border-white dark:border-black">
                <Plus className="w-2.5 h-2.5" />
              </div>
            </div>
            <span className="text-[10px] text-zinc-450 mt-1.5 font-medium text-center max-w-[60px] truncate">
              Ваша заметка
            </span>
          </div>

          {/* Other notes */}
          {[
            { username: "imom0v77", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", note: "Некуда бе" },
            { username: "Marupov", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", note: "Ислам Идигов" },
            { username: "mirzzoal", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", note: "Заметка не..." },
            { username: "alisher_99", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop", note: "На связи" }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center flex-shrink-0 cursor-pointer relative">
              <div className="relative">
                <img
                  src={item.avatar}
                  alt={item.username}
                  className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
                />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-[85px] truncate text-[9px] text-zinc-900 dark:text-zinc-100 text-center font-medium">
                  {item.note}
                </div>
              </div>
              <span className="text-[10px] text-zinc-450 mt-1.5 font-medium text-center max-w-[60px] truncate">
                {item.username}
              </span>
            </div>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="flex px-5 border-b border-zinc-200 dark:border-zinc-800 pb-2 gap-6 text-sm font-semibold select-none text-zinc-400">
          <span className="text-black dark:text-white border-b-2 border-black dark:border-white pb-2 cursor-pointer">Основная</span>
          <span className="hover:text-zinc-650 dark:hover:text-zinc-300 cursor-pointer pb-2">Общая</span>
          <span className="hover:text-zinc-650 dark:hover:text-zinc-300 cursor-pointer pb-2">Запросы (0)</span>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="text-center p-8 text-zinc-400 text-sm">Чаты не найдены.</div>
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
                    {/* Avatar with active green dot */}
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
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="font-medium text-sm truncate">{chat.username}</span>
                      <span className={`text-xs truncate ${chat.unread ? "font-bold text-black dark:text-white" : "text-zinc-400 dark:text-zinc-500"}`}>
                        {lastMsg?.image ? "Sent an attachment" : lastMsg?.text || "Started a conversation"}
                        <span className="mx-1.5">•</span>
                        {lastMsg?.time || "1d"}
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
      <div className={`flex-1 flex flex-col h-full bg-white dark:bg-black ${selectedChatId === null ? "hidden md:flex" : "flex"}`}>
        {selectedChat ? (
          <>
            {/* Header info */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedChatId(null)}
                  className="md:hidden p-1 mr-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <img
                  src={selectedChat.avatar}
                  alt={selectedChat.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm hover:underline cursor-pointer">{selectedChat.username}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{selectedChat.activeStatus}</span>
                </div>
              </div>

              {/* Call icons */}
              <div className="flex items-center gap-4 text-zinc-800 dark:text-zinc-200">
                <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full">
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Message Bubble Thread */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
              {selectedChat.messages.map((msg) => {
                const isMe = msg.sender === "me";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-[70%] ${isMe ? "self-end flex-row-reverse" : "self-start"}`}
                  >
                    {!isMe && (
                      <img
                        src={selectedChat.avatar}
                        alt={selectedChat.username}
                        className="w-7 h-7 rounded-full object-cover self-end mb-1"
                      />
                    )}
                    <div className="flex flex-col gap-1">
                      {msg.image ? (
                        <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                          <img src={msg.image} alt="Attachment" className="max-w-full h-auto object-cover max-h-60" />
                        </div>
                      ) : (
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm select-text break-words ${
                            isMe
                              ? "bg-blue-500 text-white"
                              : "bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {msg.text}
                        </div>
                      )}
                      <span className={`text-[9px] text-zinc-400 select-none ${isMe ? "text-right" : "text-left"}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
              <div className="flex items-center gap-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2.5">
                <button type="button" className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-500 cursor-pointer">
                  <Smile className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Напишите сообщение..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="bg-transparent text-sm w-full outline-none placeholder-zinc-400 border-none ring-0 p-0"
                />
                
                {inputText.trim() ? (
                  <button type="submit" className="text-blue-500 font-semibold text-sm hover:text-blue-600 px-1 animate-in fade-in duration-200 cursor-pointer">
                    Отправить
                  </button>
                ) : (
                  <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                    <button type="button" className="hover:text-zinc-500 cursor-pointer">
                      <ImageIcon className="w-5 h-5" />
                    </button>
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
              {/* Paper plane SVG inside double circles */}
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
            <button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-sm px-5 py-2 rounded-lg transition cursor-pointer">
              Отправить сообщение
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
