import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api, getFullImageUrl } from "../../services/api";

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
}

export interface Chat {
  id: number;
  username: string;
  name: string;
  avatar: string;
  active: boolean;
  activeStatus: string;
  unread: boolean;
  messages: Message[];
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

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop";

// Fallback id generator for optimistic messages when the backend response omits one.
// Negative & monotonically decreasing so it can never collide with a real (positive) backend id
// or with another optimistic message sent in the same millisecond.
let localMessageIdSeq = -1;
const nextLocalMessageId = () => localMessageIdSeq--;

const formatBackendChat = (c: any, currentUserId: string): Chat => {
  // Backend returns the other participant as `otherUser`.
  const receiver = c.otherUser || c.users?.find((u: any) => u.id !== currentUserId) || c.user || {};

  // Format messages (backend field is `senderId`)
  const rawMsgs = c.messages || [];
  const messages: Message[] = rawMsgs.map((m: any) => ({
    id: m.id || m.messageId,
    sender: (m.senderId || m.senderUserId) === currentUserId ? "me" : "them",
    text: m.messageText || m.text || "",
    image: m.isVoice ? null : getFullImageUrl(m.filePath || m.imagePath) || null,
    time: m.createAt ? new Date(m.createAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now",
    reaction: m.reactions?.[m.reactions.length - 1]?.reaction || m.reaction || null,
    isVoice: !!m.isVoice,
    voiceUrl: m.isVoice ? getFullImageUrl(m.filePath || m.imagePath) || undefined : undefined,
    durationMs: m.durationMs,
  }));

  return {
    id: c.id || c.chatId,
    username: receiver.userName || receiver.username || "direct_user",
    name: receiver.name || receiver.fullName || "Direct Conversation",
    avatar: getFullImageUrl(receiver.avatar || receiver.imagePath) || DEFAULT_AVATAR,
    active: receiver.isActive || false,
    activeStatus: receiver.isActive ? "В сети" : "Был(-а) в сети недавно",
    unread: c.isUnread || false,
    messages,
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
      currentUserId,
    }: {
      chatId: number;
      messageText?: string;
      file?: File;
      voice?: { durationMs: number };
      currentUserId: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const message = await api.chat.sendMessage(
        chatId,
        messageText,
        file,
        voice ? { isVoice: true, durationMs: voice.durationMs } : undefined
      );
      // Re-map response
      return {
        chatId,
        message: {
          id: message.id || message.messageId || nextLocalMessageId(),
          sender: "me" as const,
          text: messageText || "",
          image: voice ? null : (message.filePath || message.imagePath || null),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isVoice: !!voice,
          voiceUrl: voice ? (getFullImageUrl(message.filePath || message.imagePath) || (file ? URL.createObjectURL(file) : undefined)) : undefined,
          durationMs: voice?.durationMs,
        },
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to send message.");
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
  async ({ messageId, chatId }: { messageId: number; chatId: number }, { rejectWithValue }) => {
    try {
      await api.chat.deleteMessage(messageId);
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
        state.chats = action.payload;
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

      // Send Message Local updates
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { chatId, message } = action.payload;
        // Append to active chat
        if (state.activeChat && state.activeChat.id === chatId) {
          state.activeChat.messages.push(message);
        }
        // Update in lists
        const chatInList = state.chats.find((c) => c.id === chatId);
        if (chatInList) {
          chatInList.messages.push(message);
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
      });
  },
});

export const { selectChat } = chatsSlice.actions;
export default chatsSlice.reducer;
