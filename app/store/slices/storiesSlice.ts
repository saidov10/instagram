import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api, getFullImageUrl } from "../../services/api";

export type StickerType = "POLL" | "QUESTION";

/** An interactive sticker overlaid on a story (a poll or an open question). */
export interface StorySticker {
  id: number | string;
  type: StickerType;
  question: string;
  options: string[];
  /** Which option the current viewer already voted for, if any. */
  myOptionIndex: number | null;
  /** The answer the current viewer already submitted, if any. */
  myAnswer: string | null;
}

export interface Story {
  id: number;
  username: string;
  avatar: string;
  image: string;
  viewed: boolean;
  isForCloseFriends: boolean;
  userId?: string;
  likes?: number;
  createAt?: string;
  isLiked: boolean;
  /** The emoji the viewer reacted with, when it wasn't a plain heart. */
  reaction: string | null;
  sticker: StorySticker | null;
}

interface StoriesState {
  stories: Story[];
  myStories: Story[];
  loading: boolean;
  error: string | null;
}

const initialState: StoriesState = {
  stories: [],
  myStories: [],
  loading: false,
  error: null,
};

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop";

/**
 * The sticker may arrive as a nested `sticker` object or flattened onto the story
 * (stickerType/stickerQuestion/stickerOptions) — accept both.
 */
const formatSticker = (s: any): StorySticker | null => {
  const raw = s.sticker || s.storySticker || null;
  const type = String(raw?.type || raw?.stickerType || s.stickerType || "").toUpperCase();
  if (type !== "POLL" && type !== "QUESTION") return null;

  const id = raw?.id ?? raw?.stickerId ?? s.stickerId;
  if (id == null) return null;

  const rawOptions = raw?.options ?? raw?.stickerOptions ?? s.stickerOptions ?? [];
  const options: string[] = Array.isArray(rawOptions)
    ? rawOptions.map((o: any) => (typeof o === "string" ? o : o?.text ?? o?.option ?? "")).filter(Boolean)
    : [];

  const myOptionIndex = raw?.myOptionIndex ?? raw?.selectedOptionIndex ?? s.selectedOptionIndex;

  return {
    id,
    type: type as StickerType,
    question: raw?.question || raw?.stickerQuestion || s.stickerQuestion || "",
    options,
    myOptionIndex: typeof myOptionIndex === "number" ? myOptionIndex : null,
    myAnswer: raw?.myAnswer ?? raw?.textAnswer ?? null,
  };
};

export const formatBackendStory = (s: any): Story => ({
  id: s.id || s.storyId,
  username: s.userName || s.username || s.viewerDto?.userName || "user",
  avatar: getFullImageUrl(s.userAvatar || s.viewerDto?.avatar),
  image: getFullImageUrl(s.fileName || s.imagePath || s.image) || DEFAULT_AVATAR,
  viewed: s.isViewed || false,
  isForCloseFriends: !!s.isForCloseFriends,
  userId: s.userId || "",
  likes: s.viewerDto?.viewLike || 0,
  createAt: s.createAt || "",
  isLiked: !!(s.isLiked ?? s.viewerDto?.isLiked),
  reaction: s.reaction || s.viewerDto?.reaction || null,
  sticker: formatSticker(s),
});

// Async Thunks
export const fetchStories = createAsyncThunk(
  "stories/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const list = await api.story.getStories();
      return list.map(formatBackendStory);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load stories.");
    }
  }
);

export const fetchMyStories = createAsyncThunk(
  "stories/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const list = await api.story.getMyStories();
      return list.map(formatBackendStory);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load your stories.");
    }
  }
);

export const createStory = createAsyncThunk(
  "stories/create",
  async (
    {
      file,
      postId,
      isForCloseFriends = false,
      sticker,
    }: {
      file: File;
      postId?: number;
      isForCloseFriends?: boolean;
      sticker?: { type: StickerType; question: string; options?: string[] };
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const res = await api.story.addStory(file, postId, isForCloseFriends, sticker);
      dispatch(fetchStories());
      dispatch(fetchMyStories());
      return res;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to create story.");
    }
  }
);

/**
 * The endpoint toggles: calling it on an already-liked story removes the like.
 * `wasLiked` is what the UI saw before the click, so the reducer can settle on the flipped state.
 */
export const likeStory = createAsyncThunk(
  "stories/like",
  async (
    { storyId, reaction, wasLiked }: { storyId: number; reaction?: string; wasLiked: boolean },
    { rejectWithValue }
  ) => {
    try {
      await api.story.likeStory(storyId, reaction);
      return { storyId, reaction: reaction || null, isLiked: !wasLiked };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to like story.");
    }
  }
);

export const answerSticker = createAsyncThunk(
  "stories/answerSticker",
  async (
    {
      storyId,
      stickerId,
      selectedOptionIndex,
      textAnswer,
    }: {
      storyId: number;
      stickerId: number | string;
      selectedOptionIndex?: number;
      textAnswer?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      await api.story.answerSticker({ stickerId, selectedOptionIndex, textAnswer });
      return { storyId, selectedOptionIndex, textAnswer };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to answer sticker.");
    }
  }
);

export const viewStory = createAsyncThunk(
  "stories/view",
  async (storyId: number, { rejectWithValue }) => {
    try {
      await api.story.addStoryView(storyId);
      return storyId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to view story.");
    }
  }
);

export const deleteStory = createAsyncThunk(
  "stories/delete",
  async (storyId: number, { rejectWithValue }) => {
    try {
      await api.story.deleteStory(storyId);
      return storyId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete story.");
    }
  }
);

const storiesSlice = createSlice({
  name: "stories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Stories
      .addCase(fetchStories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStories.fulfilled, (state, action: PayloadAction<Story[]>) => {
        state.loading = false;
        state.stories = action.payload;
      })
      .addCase(fetchStories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch My Stories
      .addCase(fetchMyStories.fulfilled, (state, action: PayloadAction<Story[]>) => {
        state.myStories = action.payload;
      })

      // View Story Local Mutation
      .addCase(viewStory.fulfilled, (state, action: PayloadAction<number>) => {
        [state.stories, state.myStories].forEach((list) => {
          const story = list.find((s) => s.id === action.payload);
          if (story) story.viewed = true;
        });
      })

      // Like Story Mutation (the backend toggles, so mirror that here)
      .addCase(likeStory.fulfilled, (state, action) => {
        const { storyId, reaction, isLiked } = action.payload;
        [state.stories, state.myStories].forEach((list) => {
          const story = list.find((s) => s.id === storyId);
          if (!story) return;
          story.isLiked = isLiked;
          story.reaction = isLiked ? reaction : null;
          story.likes = Math.max(0, (story.likes || 0) + (isLiked ? 1 : -1));
        });
      })

      // Sticker answered — remember it so the viewer shows results instead of the form
      .addCase(answerSticker.fulfilled, (state, action) => {
        const { storyId, selectedOptionIndex, textAnswer } = action.payload;
        [state.stories, state.myStories].forEach((list) => {
          const story = list.find((s) => s.id === storyId);
          if (!story?.sticker) return;
          if (typeof selectedOptionIndex === "number") {
            story.sticker.myOptionIndex = selectedOptionIndex;
          }
          if (textAnswer) {
            story.sticker.myAnswer = textAnswer;
          }
        });
      })

      // Delete Story
      .addCase(deleteStory.fulfilled, (state, action: PayloadAction<number>) => {
        state.stories = state.stories.filter((s) => s.id !== action.payload);
        state.myStories = state.myStories.filter((s) => s.id !== action.payload);
      });
  },
});

export default storiesSlice.reducer;
