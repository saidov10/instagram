import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api, getFullImageUrl } from "../../services/api";
export interface Comment {
  id: number;
  username: string;
  text: string;
}

export interface Post {
  id: number;
  userId: string;
  username: string;
  avatar: string;
  location: string;
  image: string;
  caption: string;
  likes: number;
  time: string;
  isLiked: boolean;
  isSaved: boolean;
  comments: Comment[];
  collabUser?: string;
  isVerified?: boolean;
}

interface PostsState {
  posts: Post[];
  reels: any[];
  myPosts: Post[];
  savedPosts: Post[];
  loading: boolean;
  error: string | null;
}

const initialState: PostsState = {
  posts: [],
  reels: [],
  myPosts: [],
  savedPosts: [],
  loading: false,
  error: null,
};

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop";

export const formatBackendPost = (p: any): Post => {
  const likeCount = typeof p.likeCount === "number" ? p.likeCount : (Array.isArray(p.likes) ? p.likes.length : 0);

  return {
    id: p.id || p.postId,
    userId: p.userId || p.userProfileId || "",
    username: p.userName || p.username || "user",
    avatar: getFullImageUrl(p.userAvatar || p.userImage) || DEFAULT_AVATAR,
    location: p.locationName || p.location || "",
    image: getFullImageUrl((p.images && p.images[0]) || p.filePath || p.imagePath || p.image) || DEFAULT_AVATAR,
    caption: p.content || p.title || "",
    likes: likeCount,
    time: p.createAt ? new Date(p.createAt).toLocaleDateString() : "Just now",
    // Backend now returns these directly on the post object, based on the JWT-authenticated user.
    isLiked: !!p.isLiked,
    isSaved: !!p.isSaved,
    comments: (p.comments || []).map((c: any) => ({
      id: c.id || c.commentId,
      username: c.userName || c.username || "commenter",
      text: c.comment || c.text || "",
    })),
  };
};

// Async Thunks
export const fetchFollowingPosts = createAsyncThunk(
  "posts/fetchFollowing",
  async (params: { userId?: string; pageNumber?: number; pageSize?: number } = {}, { rejectWithValue }) => {
    try {
      // Default to getFollowingPost if logged in, fallback to getPosts
      let list;
      try {
        list = await api.post.getFollowingPost(params);
      } catch {
        list = await api.post.getPosts(params);
      }
      return list.map(formatBackendPost);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load posts.");
    }
  }
);

export const fetchPosts = createAsyncThunk(
  "posts/fetchAll",
  async (params: { userId?: string; pageNumber?: number; pageSize?: number } = {}, { rejectWithValue }) => {
    try {
      const list = await api.post.getPosts(params);
      return list.map(formatBackendPost);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load posts.");
    }
  }
);

export const fetchMyPosts = createAsyncThunk(
  "posts/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const list = await api.post.getMyPosts();
      return list.map(formatBackendPost);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load my posts.");
    }
  }
);

export const fetchPostFavorites = createAsyncThunk(
  "posts/fetchFavorites",
  async (params: { pageNumber?: number; pageSize?: number } = {}, { rejectWithValue }) => {
    try {
      const res = await api.profile.getPostFavorites(params.pageNumber, params.pageSize);
      const list = Array.isArray(res) ? res : res?.data || [];
      return list.map(formatBackendPost);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load saved posts.");
    }
  }
);

export const fetchReels = createAsyncThunk(
  "posts/fetchReels",
  async (params: { pageNumber?: number; pageSize?: number } = {}, { rejectWithValue }) => {
    try {
      const list = await api.post.getReels(params.pageNumber, params.pageSize);
      return list; // Return reels as-is (we'll format in component or thunk)
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load reels.");
    }
  }
);

export const createPost = createAsyncThunk(
  "posts/create",
  async (data: { title: string; content: string; images: File[]; isReel?: boolean }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.post.addPost(data);
      dispatch(fetchFollowingPosts({}));
      if (data.isReel) {
        dispatch(fetchReels({}));
      }
      return res;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to upload post.");
    }
  }
);

export const toggleLikePost = createAsyncThunk(
  "posts/toggleLike",
  async (postId: number, { rejectWithValue }) => {
    try {
      await api.post.likePost(postId);
      return postId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle like.");
    }
  }
);

export const addComment = createAsyncThunk(
  "posts/addComment",
  async (data: { postId: number; comment: string; username: string }, { rejectWithValue }) => {
    try {
      await api.post.addComment({ postId: data.postId, comment: data.comment });
      return { postId: data.postId, comment: data.comment, username: data.username };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to add comment.");
    }
  }
);

export const deletePost = createAsyncThunk(
  "posts/delete",
  async (postId: number, { rejectWithValue }) => {
    try {
      await api.post.deletePost(postId);
      return postId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete post.");
    }
  }
);

export const addPostFavorite = createAsyncThunk(
  "posts/favorite",
  async (postId: number, { rejectWithValue }) => {
    try {
      await api.post.addPostFavorite({ postId });
      return postId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to save post.");
    }
  }
);

const postsSlice = createSlice({
  name: "posts",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Following Posts
      .addCase(fetchFollowingPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFollowingPosts.fulfilled, (state, action: PayloadAction<Post[]>) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchFollowingPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch All Posts
      .addCase(fetchPosts.fulfilled, (state, action: PayloadAction<Post[]>) => {
        state.posts = action.payload;
      })

      // Fetch My Posts
      .addCase(fetchMyPosts.fulfilled, (state, action: PayloadAction<Post[]>) => {
        state.myPosts = action.payload;
      })

      // Fetch Reels
      .addCase(fetchReels.fulfilled, (state, action) => {
        state.reels = action.payload;
      })

      // Fetch Saved (Favorite) Posts
      .addCase(fetchPostFavorites.fulfilled, (state, action: PayloadAction<Post[]>) => {
        state.savedPosts = action.payload;
      })

      // Local mutations to speed up user response
      // Toggle Like
      .addCase(toggleLikePost.fulfilled, (state, action: PayloadAction<number>) => {
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === action.payload);
          if (post) {
            post.isLiked = !post.isLiked;
            post.likes = post.isLiked ? post.likes + 1 : post.likes - 1;
          }
        });
      })

      // Add Comment
      .addCase(addComment.fulfilled, (state, action) => {
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === action.payload.postId);
          if (post) {
            post.comments.push({
              id: Date.now(),
              username: action.payload.username,
              text: action.payload.comment,
            });
          }
        });
      })

      // Add Post Favorite (backend toggles saved/unsaved)
      .addCase(addPostFavorite.fulfilled, (state, action: PayloadAction<number>) => {
        [state.posts, state.myPosts].forEach((list) => {
          const post = list.find((p) => p.id === action.payload);
          if (post) post.isSaved = !post.isSaved;
        });
        state.savedPosts = state.savedPosts.filter((p) => p.id !== action.payload);
      })

      // Delete Post
      .addCase(deletePost.fulfilled, (state, action: PayloadAction<number>) => {
        state.posts = state.posts.filter((p) => p.id !== action.payload);
        state.myPosts = state.myPosts.filter((p) => p.id !== action.payload);
        state.savedPosts = state.savedPosts.filter((p) => p.id !== action.payload);
      });
  },
});

export default postsSlice.reducer;
