import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api, getFullImageUrl } from "../../services/api";

/** Quoted original shown above a threaded reply. */
export interface ReplyPreview {
  id: number;
  senderId: string;
  senderName: string;
  messageText: string;
}

export interface Message {
  id: number;
  sender: "me" | "them";
  text?: string;
  image?: string;
  time: string;
  reaction?: string;
  isVoice?: boolean;
  voiceUrl?: string;
  durationMs?: number;
  /** Present when this message is a reply to another one. */
  replyTo?: ReplyPreview | null;
  /** Author display info — only meaningful in group chats. */
  senderName?: string;
  senderAvatar?: string;
  /** Locked media bubble — `image` stays empty until `open-view-once-message` is called. */
  isViewOnce?: boolean;
  viewOnceOpened?: boolean;
}

export interface GroupParticipant {
  userId: string;
  username: string;
  avatar: string;
  isAdmin: boolean;
}

export interface GroupInfo {
  name: string;
  avatar: string;
  adminIds: string[];
  participantsCount: number;
  participants: GroupParticipant[];
}

export interface Chat {
  id: number;
  /** The other participant's user id — needed to place a call into this chat. Empty for groups. */
  otherUserId: string;
  username: string;
  name: string;
  avatar: string;
  unread: boolean;
  messages: Message[];
  /** Preview for the chat list — the full `messages` array only loads once the thread is opened. */
  lastMessage: Message | null;
  /** ISO timestamp used to sort the inbox most-recent-first. */
  lastActivityAt: string;
  /** ISO timestamp of the other user's last activity ping. Null for groups. */
  lastSeenAt: string | null;
  isGroup: boolean;
  groupInfo: GroupInfo | null;
  isVanishMode: boolean;
  isPinned: boolean;
}

interface ChatsState {
  chats: Chat[];
  activeChat: Chat | null;
  loading: boolean;
  error: string | null;
}

const initialState: ChatsState = {
  chats: [],
  activeChat: null,
  loading: false,
  error: null,
};

// Fallback id generator for optimistic messages when the backend response omits one.
// Negative & monotonically decreasing so it can never collide with a real (positive) backend id
// or with another optimistic message sent in the same millisecond.
let localMessageIdSeq = -1;
const nextLocalMessageId = () => localMessageIdSeq--;

const formatReplyTo = (raw: any): ReplyPreview | null => {
  if (!raw) return null;
  const id = raw.id ?? raw.messageId;
  if (id == null) return null;
  return {
    id,
    senderId: raw.senderId || raw.senderUserId || "",
    senderName: raw.senderName || raw.userName || "Пользователь",
    messageText: raw.messageText || raw.text || "",
  };
};

const formatMessage = (m: any, currentUserId: string): Message => ({
  id: m.id || m.messageId,
  sender: (m.senderId || m.senderUserId) === currentUserId ? "me" : "them",
  text: m.messageText || m.text || "",
  image: m.isVoice || (m.isViewOnce && !m.viewOnceOpened) ? undefined : getFullImageUrl(m.filePath || m.imagePath) || undefined,
  time: m.createAt ? new Date(m.createAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
  reaction: m.reactions?.[m.reactions.length - 1]?.reaction || m.reaction || null,
  isVoice: !!m.isVoice,
  voiceUrl: m.isVoice ? getFullImageUrl(m.filePath || m.imagePath) || undefined : undefined,
  durationMs: m.durationMs,
  replyTo: formatReplyTo(m.replyTo),
  senderName: m.senderName || m.userName || undefined,
  senderAvatar: getFullImageUrl(m.senderAvatar || m.userAvatar) || undefined,
  isViewOnce: !!m.isViewOnce,
  viewOnceOpened: !!m.viewOnceOpened,
});

const formatBackendChat = (c: any, currentUserId: string): Chat => {
  // Groups carry `groupInfo` instead of `otherUser`.
  const isGroup = !!c.isGroup;
  const rawGroup = c.groupInfo || {};
  const receiver = c.otherUser || c.users?.find((u: any) => u.id !== currentUserId) || c.user || {};

  const adminIds: string[] = rawGroup.adminIds || [];
  const rawParticipants = rawGroup.participants || rawGroup.members || c.users || [];
  const groupInfo: GroupInfo | null = isGroup
    ? {
        name: rawGroup.name || "Группа",
        avatar: getFullImageUrl(rawGroup.avatar),
        adminIds,
        participantsCount: rawGroup.participantsCount || rawParticipants.length || 0,
        participants: (rawParticipants as any[]).map((p: any): GroupParticipant => {
          const uid = p.userId || p.id || "";
          return {
            userId: uid,
            username: p.userName || p.username || "user",
            avatar: getFullImageUrl(p.avatar || p.imagePath),
            isAdmin: adminIds.includes(uid),
          };
        }),
      }
    : null;

  // Format messages (backend field is `senderId`)
  const rawMsgs = c.messages || [];
  const messages: Message[] = rawMsgs.map((m: any) => formatMessage(m, currentUserId));

  // The chat-list endpoint (get-chats) sends a single `lastMessage` summary instead of the
  // full `messages` array — the full thread only arrives via get-chat-by-id. Fall back to the
  // last loaded message when the thread is already open, so both views agree once fetched.
  const rawLastMessage = c.lastMessage || rawMsgs[rawMsgs.length - 1] || null;
  const lastMessage: Message | null = rawLastMessage ? formatMessage(rawLastMessage, currentUserId) : null;
  const unread = !!rawLastMessage &&
    (rawLastMessage.senderId || rawLastMessage.senderUserId) !== currentUserId &&
    !(rawLastMessage.seenBy || []).includes(currentUserId);

  return {
    id: c.id || c.chatId,
    otherUserId: isGroup ? "" : receiver.id || receiver.userId || "",
    username: isGroup ? groupInfo!.name : receiver.userName || receiver.username || "direct_user",
    name: isGroup ? groupInfo!.name : receiver.name || receiver.fullName || "Direct Conversation",
    avatar: isGroup ? groupInfo!.avatar : getFullImageUrl(receiver.avatar || receiver.imagePath),
    unread: c.isUnread ?? unread,
    messages,
    lastMessage,
    lastActivityAt: rawLastMessage?.createAt || c.createAt || new Date(0).toISOString(),
    lastSeenAt: isGroup ? null : receiver.lastSeenAt || null,
    isGroup,
    groupInfo,
    isVanishMode: !!c.isVanishMode,
    isPinned: !!c.isPinned,
  };
};

// Async Thunks
export const fetchChats = createAsyncThunk(
  "chats/fetchAll",
  async (currentUserId: string, { rejectWithValue }) => {
    try {
      const list = await api.chat.getChats();
      return list.map((c) => formatBackendChat(c, currentUserId));
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load chats.");
    }
  }
);

export const fetchChatById = createAsyncThunk(
  "chats/fetchById",
  async ({ chatId, currentUserId }: { chatId: number; currentUserId: string }, { rejectWithValue }) => {
    try {
      const chatDetails = await api.chat.getChatById(chatId);
      return formatBackendChat(chatDetails, currentUserId);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load chat history.");
    }
  }
);

export const startNewChat = createAsyncThunk(
  "chats/create",
  async ({ receiverUserId, currentUserId }: { receiverUserId: string; currentUserId: string }, { dispatch, rejectWithValue }) => {
    try {
      const newChat = await api.chat.createChat(receiverUserId);
      const formatted = formatBackendChat(newChat, currentUserId);
      dispatch(fetchChats(currentUserId));
      return formatted;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to create chat.");
    }
  }
);

export const sendMessage = createAsyncThunk(
  "chats/sendMessage",
  async (
    {
      chatId,
      messageText,
      file,
      voice,
      replyTo,
      isViewOnce,
    }: {
      chatId: number;
      messageText?: string;
      file?: File;
      voice?: { durationMs: number };
      /** The message being replied to; its id is sent to the backend. */
      replyTo?: ReplyPreview | null;
      currentUserId: string;
      isViewOnce?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const message = await api.chat.sendMessage(
        chatId,
        messageText,
        file,
        voice ? { isVoice: true, durationMs: voice.durationMs } : undefined,
        replyTo?.id,
        isViewOnce
      );
      // Re-map response
      return {
        chatId,
        message: {
          id: message.id || message.messageId || nextLocalMessageId(),
          sender: "me" as const,
          text: messageText || "",
          image: voice || message.isViewOnce ? undefined : (getFullImageUrl(message.filePath || message.imagePath) || undefined),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isVoice: !!voice,
          voiceUrl: voice ? (getFullImageUrl(message.filePath || message.imagePath) || (file ? URL.createObjectURL(file) : undefined)) : undefined,
          durationMs: voice?.durationMs,
          // Prefer the server's echo, but fall back to the local preview so the
          // quote renders immediately instead of after the next refetch.
          replyTo: formatReplyTo(message.replyTo) || replyTo || null,
          isViewOnce: !!message.isViewOnce,
          viewOnceOpened: false,
        },
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to send message.");
    }
  }
);

export const startNewGroupChat = createAsyncThunk(
  "chats/createGroup",
  async (
    { name, participantIds, currentUserId }: { name: string; participantIds: string[]; currentUserId: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const newChat = await api.chat.createGroupChat(name, participantIds);
      const formatted = formatBackendChat(newChat, currentUserId);
      dispatch(fetchChats(currentUserId));
      return formatted;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to create group chat.");
    }
  }
);

export const toggleVanishMode = createAsyncThunk(
  "chats/toggleVanishMode",
  async ({ chatId, isVanishMode }: { chatId: number; isVanishMode: boolean }, { rejectWithValue }) => {
    try {
      await api.chat.toggleVanishMode(chatId, isVanishMode);
      return { chatId, isVanishMode };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle vanish mode.");
    }
  }
);

export const reactToMessage = createAsyncThunk(
  "chats/react",
  async ({ messageId, reaction, chatId }: { messageId: number; reaction: string; chatId: number }, { rejectWithValue }) => {
    try {
      await api.chat.reactToMessage(messageId, reaction);
      return { messageId, reaction, chatId };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to send reaction.");
    }
  }
);

export const deleteMessage = createAsyncThunk(
  "chats/deleteMessage",
  async ({ messageId, chatId, forEveryone }: { messageId: number; chatId: number; forEveryone?: boolean }, { rejectWithValue }) => {
    try {
      await api.chat.deleteMessage(messageId, forEveryone);
      return { messageId, chatId };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete message.");
    }
  }
);

export const deleteChat = createAsyncThunk(
  "chats/deleteChat",
  async (chatId: number, { rejectWithValue }) => {
    try {
      await api.chat.deleteChat(chatId);
      return chatId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete chat.");
    }
  }
);

/** Tap-to-reveal — swaps the locked bubble for the one-time mediaUrl the server just wiped its own copy of. */
export const openViewOnceMessage = createAsyncThunk(
  "chats/openViewOnce",
  async ({ messageId, chatId }: { messageId: number; chatId: number }, { rejectWithValue }) => {
    try {
      const res = await api.chat.openViewOnceMessage(messageId);
      return { messageId, chatId, mediaUrl: res.mediaUrl };
    } catch (err: any) {
      return rejectWithValue(err.message || "Не удалось открыть медиа.");
    }
  }
);

export const pinChat = createAsyncThunk(
  "chats/pinChat",
  async ({ chatId, isPinned }: { chatId: number; isPinned: boolean }, { rejectWithValue }) => {
    try {
      await api.chat.pinChat(chatId, isPinned);
      return { chatId, isPinned };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to pin chat.");
    }
  }
);

const chatsSlice = createSlice({
  name: "chats",
  initialState,
  reducers: {
    selectChat(state, action: PayloadAction<number | null>) {
      const chat = state.chats.find((c) => c.id === action.payload);
      state.activeChat = chat || null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Chats
      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action: PayloadAction<Chat[]>) => {
        state.loading = false;
        // Pinned first, then most-recent-message first.
        state.chats = [...action.payload].sort((a, b) => {
          const pinDiff = Number(b.isPinned) - Number(a.isPinned);
          if (pinDiff !== 0) return pinDiff;
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        });
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch Chat By ID
      .addCase(fetchChatById.fulfilled, (state, action: PayloadAction<Chat>) => {
        state.activeChat = action.payload;
        // Also update inside the chats list
        const index = state.chats.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.chats[index] = action.payload;
        } else {
          state.chats.push(action.payload);
        }
      })

      // Create/Start Chat
      .addCase(startNewChat.fulfilled, (state, action: PayloadAction<Chat>) => {
        state.activeChat = action.payload;
        if (!state.chats.some((c) => c.id === action.payload.id)) {
          state.chats.push(action.payload);
        }
      })

      // Create Group Chat
      .addCase(startNewGroupChat.fulfilled, (state, action: PayloadAction<Chat>) => {
        state.activeChat = action.payload;
        if (!state.chats.some((c) => c.id === action.payload.id)) {
          state.chats.push(action.payload);
        }
      })

      // Vanish mode
      .addCase(toggleVanishMode.fulfilled, (state, action) => {
        const { chatId, isVanishMode } = action.payload;
        if (state.activeChat && state.activeChat.id === chatId) {
          state.activeChat.isVanishMode = isVanishMode;
        }
        const chat = state.chats.find((c) => c.id === chatId);
        if (chat) chat.isVanishMode = isVanishMode;
      })

      // Send Message Local updates
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { chatId, message } = action.payload;
        // Append to active chat
        if (state.activeChat && state.activeChat.id === chatId) {
          state.activeChat.messages.push(message);
          state.activeChat.lastMessage = message;
          state.activeChat.lastActivityAt = new Date().toISOString();
        }
        // Update in lists, then float the chat back to the top of the inbox.
        const chatInList = state.chats.find((c) => c.id === chatId);
        if (chatInList) {
          chatInList.messages.push(message);
          chatInList.lastMessage = message;
          chatInList.unread = false;
          chatInList.lastActivityAt = new Date().toISOString();
          state.chats.sort((a, b) => {
            const pinDiff = Number(b.isPinned) - Number(a.isPinned);
            if (pinDiff !== 0) return pinDiff;
            return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
          });
        }
      })

      // React to message
      .addCase(reactToMessage.fulfilled, (state, action) => {
        const { messageId, reaction, chatId } = action.payload;
        if (state.activeChat && state.activeChat.id === chatId) {
          const msg = state.activeChat.messages.find((m) => m.id === messageId);
          if (msg) msg.reaction = reaction;
        }
      })

      // Delete Message
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const { messageId, chatId } = action.payload;
        if (state.activeChat && state.activeChat.id === chatId) {
          state.activeChat.messages = state.activeChat.messages.filter((m) => m.id !== messageId);
        }
        const chat = state.chats.find((c) => c.id === chatId);
        if (chat) {
          chat.messages = chat.messages.filter((m) => m.id !== messageId);
        }
      })

      // Delete Chat
      .addCase(deleteChat.fulfilled, (state, action: PayloadAction<number>) => {
        state.chats = state.chats.filter((c) => c.id !== action.payload);
        if (state.activeChat && state.activeChat.id === action.payload) {
          state.activeChat = null;
        }
      })

      // Open a view-once message — swaps the locked bubble for the one-time mediaUrl.
      .addCase(openViewOnceMessage.fulfilled, (state, action) => {
        const { messageId, chatId, mediaUrl } = action.payload;
        [state.activeChat, state.chats.find((c) => c.id === chatId)].forEach((chat) => {
          if (!chat || chat.id !== chatId) return;
          const msg = chat.messages.find((m) => m.id === messageId);
          if (msg) {
            msg.viewOnceOpened = true;
            msg.image = mediaUrl;
          }
        });
      })

      // Pin / unpin a chat — max 3, sorted pinned-first.
      .addCase(pinChat.fulfilled, (state, action) => {
        const { chatId, isPinned } = action.payload;
        const chat = state.chats.find((c) => c.id === chatId);
        if (chat) chat.isPinned = isPinned;
        state.chats.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
      });
  },
});

export const { selectChat } = chatsSlice.actions;
export default chatsSlice.reducer;
