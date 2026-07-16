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

/** A real person who viewed the story, as reported by the backend. */
export interface StoryViewer {
  userId: string;
  username: string;
  avatar: string;
  liked: boolean;
  reaction: string | null;
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
  musicTrack?: { audioUrl: string; title: string; artist: string; durationMs: number } | null;
  viewCount?: number;
  /** Real viewers list from the backend (empty when not provided). */
  viewers?: StoryViewer[];
  /** #21 — an @mention sticker tagging another user. */
  mention?: { userId: string; username: string } | null;
  link?: { url: string; label: string } | null;
  countdown?: { endsAt: string; label: string } | null;
  sharedPost?: { id: number; image: string; username: string } | null;
  /** Where the interactive/mention sticker was placed on the image (0–1 fractions), plus size/angle. */
  stickerPosition?: { x: number; y: number; scale?: number; rotation?: number } | null;
}

/** The backend still doesn't echo the @mentioned user's display name (only their id) on
 *  fetch — cache it locally, keyed by story id, purely so the creator's own client can show
 *  "@username" instead of "@profile" without an extra lookup. Same-device-only, non-critical. */
const MENTION_NAME_CACHE_KEY = "story_mention_names";

function getCachedMentionUsername(storyId: number): string | null {
  if (typeof window === "undefined") return null;
  try {
    const registry = JSON.parse(localStorage.getItem(MENTION_NAME_CACHE_KEY) || "{}");
    return registry[storyId] || null;
  } catch {
    return null;
  }
}

function setCachedMentionUsername(storyId: number, username: string) {
  if (typeof window === "undefined") return;
  try {
    const registry = JSON.parse(localStorage.getItem(MENTION_NAME_CACHE_KEY) || "{}");
    registry[storyId] = username;
    localStorage.setItem(MENTION_NAME_CACHE_KEY, JSON.stringify(registry));
  } catch (e) {
    console.error("Failed to cache mention username:", e);
  }
}

/** Normalizes whatever shape the backend uses for the viewers list. */
const formatViewers = (s: any): StoryViewer[] => {
  const raw = s.viewers || s.storyViews || s.views || s.viewerDtos || [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v: any): StoryViewer => {
      const u = v.user || v.viewer || v.userProfile || v;
      return {
        userId: u.userId || u.id || "",
        username: u.userName || u.username || "user",
        avatar: getFullImageUrl(u.avatar || u.imagePath || u.userAvatar),
        liked: !!(v.isLiked ?? v.viewLike ?? u.isLiked),
        reaction: v.reaction || u.reaction || null,
      };
    })
    .filter((v: StoryViewer) => v.userId || v.username !== "user");
};

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
 * The backend always nests sticker data (regardless of type) under a single `sticker` object:
 * `{ id, type, questionText, options, linkUrl, linkLabel, countdownEndsAt, countdownLabel,
 *    mentionedUserId }`. Older code assumed flattened `stickerX` fields on the story itself,
 * which the fetch response never actually has — accept both shapes defensively, real one first.
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
    question: raw?.questionText || raw?.question || raw?.stickerQuestion || s.stickerQuestion || "",
    options,
    myOptionIndex: typeof myOptionIndex === "number" ? myOptionIndex : null,
    myAnswer: raw?.myAnswer ?? raw?.textAnswer ?? null,
  };
};

export const formatBackendStory = (s: any): Story => {
  const id = s.id || s.storyId;
  const mediaUrl = s.fileName || s.imagePath || s.image || "";
  const sticker = s.sticker || s.storySticker || null;
  const stickerType = String(sticker?.type || s.stickerType || "").toUpperCase();

  return {
    id,
    username: s.userName || s.username || s.viewerDto?.userName || "user",
    avatar: getFullImageUrl(s.userAvatar || s.viewerDto?.avatar),
    image: getFullImageUrl(mediaUrl) || DEFAULT_AVATAR,
    viewed: s.isViewed || false,
    isForCloseFriends: !!s.isForCloseFriends,
    userId: s.userId || "",
    likes: s.viewerDto?.viewLike || 0,
    viewCount: s.viewerDto?.viewCount ?? s.viewCount ?? 0,
    viewers: formatViewers(s),
    createAt: s.createAt || "",
    isLiked: !!(s.isLiked ?? s.viewerDto?.isLiked),
    reaction: s.reaction || s.viewerDto?.reaction || null,
    sticker: formatSticker(s),
    mention: stickerType === "MENTION" && sticker?.mentionedUserId
      ? {
          userId: sticker.mentionedUserId,
          username: s.mentionUsername || getCachedMentionUsername(id) || "",
        }
      : null,
    link: stickerType === "LINK" && sticker?.linkUrl
      ? { url: sticker.linkUrl, label: sticker.linkLabel || "Ссылка" }
      : null,
    countdown: stickerType === "COUNTDOWN" && sticker?.countdownEndsAt
      ? { endsAt: sticker.countdownEndsAt, label: sticker.countdownLabel || "Обратный отсчёт" }
      : null,
    stickerPosition: sticker
      ? { x: sticker.x ?? 0.5, y: sticker.y ?? 0.5, scale: sticker.scale ?? 1, rotation: sticker.rotation ?? 0 }
      : null,
    sharedPost: s.sharedPost
      ? {
          id: s.sharedPost.id || s.sharedPostId,
          image: getFullImageUrl((s.sharedPost.images && s.sharedPost.images[0]) || s.sharedPost.image),
          username: s.sharedPost.userName || s.sharedPost.username || "user",
        }
      : null,
    musicTrack: s.audioUrl
      ? {
          audioUrl: getFullImageUrl(s.audioUrl),
          title: s.audioTitle || s.audioName || "Оригинальный звук",
          artist: s.audioArtist || "",
          durationMs: s.audioDurationMs || 0,
        }
      : null,
  };
};

// Async Thunks
export const fetchStories = createAsyncThunk(
  "stories/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const [list, users] = await Promise.all([
        api.story.getStories(),
        api.user.getUsers({ pageSize: 100 }),
      ]);
      return list.map((s: any) => {
        const u = users.find((usr: any) => usr.id === s.userId);
        return formatBackendStory({
          ...s,
          userName: u?.username || s.userName || s.username || "user",
          userAvatar: u?.avatar || s.userAvatar || s.avatar,
        });
      });
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load stories.");
    }
  }
);

export const fetchMyStories = createAsyncThunk(
  "stories/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const [list, users] = await Promise.all([
        api.story.getMyStories(),
        api.user.getUsers({ pageSize: 100 }),
      ]);
      return list.map((s: any) => {
        const u = users.find((usr: any) => usr.id === s.userId);
        return formatBackendStory({
          ...s,
          userName: u?.username || s.userName || s.username || "user",
          userAvatar: u?.avatar || s.userAvatar || s.avatar,
        });
      });
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
      mention,
      link,
      countdown,
      musicTrack,
      stickerPosition,
    }: {
      file: File;
      postId?: number;
      isForCloseFriends?: boolean;
      sticker?: { type: StickerType; question: string; options?: string[] };
      mention?: { userId: string; username: string };
      link?: { url: string; label?: string };
      countdown?: { endsAt: string; label?: string };
      musicTrack?: { id: string; title: string; artist: string; audioUrl: string; coverUrl?: string; durationMs?: number } | null;
      /** Tap-to-place position for the mention/poll/question sticker on the preview image. */
      stickerPosition?: { x: number; y: number; scale?: number; rotation?: number } | null;
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      // Exactly one sticker type ships per story.
      const stickerArg = mention
        ? { type: "MENTION" as const, mentionUserId: mention.userId, mentionUsername: mention.username }
        : link
        ? { type: "LINK" as const, url: link.url, label: link.label }
        : countdown
        ? { type: "COUNTDOWN" as const, endsAt: countdown.endsAt, label: countdown.label }
        : sticker;
      // AddStories returns the full created story object (id, audio*, sticker incl. x/y/scale/rotation).
      const created = await api.story.addStory(file, postId, isForCloseFriends, stickerArg, musicTrack, stickerPosition);

      // The backend still doesn't echo the @mentioned user's display name — cache it locally,
      // keyed by the real story id we now get back directly.
      if (mention?.username && created?.id != null) {
        setCachedMentionUsername(created.id, mention.username);
      }

      dispatch(fetchStories());
      dispatch(fetchMyStories());
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

      // View Story Local Mutation — only flip the "viewed" flag. The real, de-duplicated
      // view count comes from the server (viewerDto.viewCount); incrementing here would
      // inflate it on every re-open, so we deliberately don't touch viewCount.
      .addCase(viewStory.fulfilled, (state, action: PayloadAction<number>) => {
        [state.stories, state.myStories].forEach((list) => {
          const story = list.find((s) => s.id === action.payload);
          if (story) {
            story.viewed = true;
          }
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
