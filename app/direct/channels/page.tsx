"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { ChevronLeft, Plus, Radio, X, Send } from "lucide-react";
import { RootState } from "../../store/store";
import { api, getFullImageUrl } from "../../services/api";
import Avatar from "../../components/Avatar";

interface Channel {
  id: string;
  name: string;
  description: string;
  avatar: string;
  ownerId: string;
  subscriberCount: number;
  isOwner: boolean;
  isSubscribed: boolean;
}

interface ChannelMessage {
  id: string;
  text: string;
  senderId: string;
  createAt: string;
}

export default function ChannelsPage() {
  const router = useRouter();
  const { currentUser } = useSelector((state: RootState) => state.auth);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChannel, setOpenChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [subBusy, setSubBusy] = useState<Record<string, boolean>>({});

  const load = () => {
    setLoading(true);
    api.broadcast
      .getChannels()
      .then((list) =>
        setChannels(
          (list || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description || "",
            avatar: getFullImageUrl(c.avatar),
            ownerId: c.ownerId,
            subscriberCount: c.subscriberCount ?? (c.subscriberIds || []).length,
            isOwner: !!c.isOwner,
            isSubscribed: (c.subscriberIds || []).includes(currentUser?.id),
          }))
        )
      )
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (currentUser) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const openChannelThread = (channel: Channel) => {
    setOpenChannel(channel);
    api.broadcast
      .getMessages(channel.id)
      .then((list) =>
        setMessages(
          (list || []).map((m: any) => ({
            id: m.id,
            text: m.text || "",
            senderId: m.senderId || "",
            createAt: m.createAt || "",
          }))
        )
      )
      .catch(() => setMessages([]));
  };

  const handleToggleSubscribe = async (channel: Channel) => {
    if (subBusy[channel.id]) return;
    setSubBusy((b) => ({ ...b, [channel.id]: true }));
    try {
      if (channel.isSubscribed) await api.broadcast.unsubscribe(channel.id);
      else await api.broadcast.subscribe(channel.id);
      load();
    } catch (err) {
      console.error("Failed to toggle channel subscription:", err);
    } finally {
      setSubBusy((b) => ({ ...b, [channel.id]: false }));
    }
  };

  const handleCreateChannel = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await api.broadcast.createChannel(newName.trim(), newDescription.trim() || undefined);
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      load();
    } catch (err) {
      console.error("Failed to create channel:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleSendChannelMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openChannel || !messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput("");
    try {
      await api.broadcast.sendMessage(openChannel.id, text);
      setMessages((prev) => [...prev, { id: `local-${Date.now()}`, text, senderId: currentUser?.id || "", createAt: new Date().toISOString() }]);
    } catch (err) {
      console.error("Failed to send channel message:", err);
    }
  };

  if (openChannel) {
    return (
      <div className="w-full max-w-lg mx-auto h-[calc(100vh-64px)] md:h-screen flex flex-col text-black dark:text-white">
        <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800">
          <button onClick={() => setOpenChannel(null)} className="hover:opacity-60 cursor-pointer">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <Avatar src={openChannel.avatar} name={openChannel.name} className="w-9 h-9" />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate">{openChannel.name}</span>
            <span className="text-xs text-zinc-500">{openChannel.subscriberCount} подписчиков</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-16">Сообщений пока нет.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="glass rounded-2xl rounded-tl-md px-4 py-2.5 text-sm max-w-[80%] self-start">
                {m.text}
              </div>
            ))
          )}
        </div>

        {openChannel.isOwner && (
          <form onSubmit={handleSendChannelMessage} className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Сообщение для подписчиков..."
              className="flex-1 bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-full px-4 py-2.5 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={!messageInput.trim()}
              className="w-10 h-10 rounded-full btn-primary flex items-center justify-center disabled:opacity-40 cursor-pointer flex-shrink-0"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 text-black dark:text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/direct/inbox")} className="hover:opacity-60 cursor-pointer">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Каналы</h1>
        </div>
        <button onClick={() => setShowCreate(true)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full cursor-pointer">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-full h-16 rounded-xl shimmer" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Radio className="w-10 h-10 text-zinc-400" />
          <p className="text-sm text-zinc-500 max-w-xs">Каналов пока нет. Создайте свой, чтобы делать объявления подписчикам.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {channels.map((c) => (
            <div
              key={c.id}
              onClick={() => openChannelThread(c)}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              <Avatar src={c.avatar} name={c.name} className="w-12 h-12" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm block truncate">{c.name}</span>
                <span className="text-xs text-zinc-500">{c.subscriberCount} подписчиков{c.isOwner && " · вы владелец"}</span>
              </div>
              {!c.isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSubscribe(c);
                  }}
                  disabled={subBusy[c.id]}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-lg cursor-pointer disabled:opacity-50 flex-shrink-0 ${
                    c.isSubscribed ? "glass" : "btn-primary"
                  }`}
                >
                  {c.isSubscribed ? "Отписаться" : "Подписаться"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="glass-strong w-full max-w-sm rounded-3xl shadow-soft-lg p-5 flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">Новый канал</h3>
              <button onClick={() => setShowCreate(false)} className="hover:opacity-70 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Название"
              className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Описание (необязательно)"
              rows={2}
              className="bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none resize-none"
            />
            <button
              onClick={handleCreateChannel}
              disabled={!newName.trim() || creating}
              className="btn-primary py-2.5 text-sm font-bold disabled:opacity-50 cursor-pointer"
            >
              {creating ? "Создание..." : "Создать"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
