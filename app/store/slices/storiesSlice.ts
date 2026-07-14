import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api, getFullImageUrl } from "../../services/api";

export interface Story {
  id: number;
  username: string;
  avatar: string;
  image: string;
  viewed: boolean;
  userId?: string;
  likes?: number;
  createAt?: string;
}

interface StoriesState {
  stories: Story[];
  loading: boolean;
  error: string | null;
}

const initialState: StoriesState = {
  stories: [],
  loading: false,
  error: null,
};

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop";

const formatBackendStory = (s: any): Story => ({
  id: s.id || s.storyId,
  username: s.userName || s.username || s.viewerDto?.userName || "user",
  avatar: getFullImageUrl(s.userAvatar || s.viewerDto?.avatar) || DEFAULT_AVATAR,
  image: getFullImageUrl(s.fileName || s.imagePath || s.image) || DEFAULT_AVATAR,
  viewed: s.isViewed || false,
  userId: s.userId || "",
  likes: s.viewerDto?.viewLike || 0,
  createAt: s.createAt || "",
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

export const createStory = createAsyncThunk(
  "stories/create",
  async ({ file, postId }: { file: File; postId?: number }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.story.addStory(file, postId);
      dispatch(fetchStories());
      return res;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to create story.");
    }
  }
);

export const likeStory = createAsyncThunk(
  "stories/like",
  async (storyId: number, { rejectWithValue }) => {
    try {
      await api.story.likeStory(storyId);
      return storyId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to like story.");
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

      // View Story Local Mutation
      .addCase(viewStory.fulfilled, (state, action: PayloadAction<number>) => {
        const story = state.stories.find((s) => s.id === action.payload);
        if (story) {
          story.viewed = true;
        }
      })

      // Like Story Mutation
      .addCase(likeStory.fulfilled, (state, action: PayloadAction<number>) => {
        const story = state.stories.find((s) => s.id === action.payload);
        if (story) {
          story.likes = (story.likes || 0) + 1;
        }
      })

      // Delete Story
      .addCase(deleteStory.fulfilled, (state, action: PayloadAction<number>) => {
        state.stories = state.stories.filter((s) => s.id !== action.payload);
      });
  },
});

export default storiesSlice.reducer;
