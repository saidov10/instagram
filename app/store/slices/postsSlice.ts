import { createSlice, createAsyncThunk, createAction, PayloadAction } from "@reduxjs/toolkit";
import { api, getFullImageUrl } from "../../services/api";
export interface Comment {
  id: number;
  userId: string;
  username: string;
  avatar?: string;
  text: string;
  likeCount: number;
  isLiked: boolean;
  /** Author-pinned comment (feature #13). Top-level only. */
  isPinned?: boolean;
  parentCommentId?: number | null;
  replyCount: number;
  replies: Comment[];
}

/**
 * Normalizes a backend comment (and its nested replies) into the tree shape the UI expects.
 * The backend returns top-level comments each carrying a `replies` array.
 */
export const formatComment = (c: any): Comment => {
  const replies = Array.isArray(c.replies) ? c.replies.map(formatComment) : [];
  return {
    id: c.id ?? c.commentId,
    userId: c.userId || "",
    username: c.userName || c.username || "commenter",
    avatar: getFullImageUrl(c.userAvatar || c.avatar || c.userImage),
    text: c.comment ?? c.text ?? "",
    likeCount: typeof c.likeCount === "number" ? c.likeCount : (Array.isArray(c.likes) ? c.likes.length : 0),
    isLiked: !!c.isLiked,
    isPinned: !!c.isPinned,
    parentCommentId: c.parentCommentId ?? null,
    replyCount: typeof c.replyCount === "number" ? c.replyCount : replies.length,
    replies,
  };
};

export interface TaggedUser {
  userId: string;
  username: string;
  avatar: string;
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
  allowComments: boolean;
  /** Owner-only: WHO may comment when comments are on. Separate from the allowComments on/off switch. */
  commentPermission?: "EVERYONE" | "FOLLOWING" | "FOLLOWERS";
  comments: Comment[];
  collabUser?: string;
  isVerified?: boolean;
  isArchived?: boolean;
  taggedUsers?: TaggedUser[];
  /** #14 — owner hid the like count; viewers get likeCount: null from the backend. */
  hideLikeCount?: boolean;
  /** #24 — owner flagged the post sensitive; isBlurred is the viewer-resolved blur state. */
  isSensitive?: boolean;
  isBlurred?: boolean;
  /** #17 — when this is a repost, the original author it was reposted from. */
  repostedFrom?: string;
  repostedFromUserId?: string;
  /** #16 — approved collaborators shown alongside the author in the header. */
  collaborators?: TaggedUser[];
  /** Reel post: `image` is the static coverUrl thumbnail; `videoUrl` is the actual playable file. */
  isReel?: boolean;
  videoUrl?: string;
  isPinnedToProfile?: boolean;
  isAgeRestricted?: boolean;
  allowStorySharing?: boolean;
  isForCloseFriends?: boolean;
  locationId?: number | null;
  images?: string[];
  /** Accessibility label for the (first) image, set by the author in the composer. */
  altText?: string;
  productTags?: { id?: string; name: string; price: number; currency: string; url?: string; x: number; y: number }[];
}

export interface SavedAudio {
  audioId: string;
  title: string;
  artist: string;
  audioUrl: string;
}

export interface Collection {
  id: number;
  name: string;
  cover: string;
  count: number;
}

export const formatCollection = (c: any): Collection => ({
  id: c.id ?? c.collectionId,
  name: c.name || "Коллекция",
  cover: getFullImageUrl(c.cover || c.coverImage || c.thumbnail || (c.posts && c.posts[0]?.images?.[0])),
  count: typeof c.count === "number" ? c.count : (c.postCount ?? c.posts?.length ?? 0),
});

interface PostsState {
  posts: Post[];
  reels: any[];
  myPosts: Post[];
  savedPosts: Post[];
  archivedPosts: Post[];
  taggedPosts: Post[];
  savedAudios: SavedAudio[];
  collections: Collection[];
  loading: boolean;
  error: string | null;
}

const initialState: PostsState = {
  posts: [],
  reels: [],
  myPosts: [],
  savedPosts: [],
  archivedPosts: [],
  taggedPosts: [],
  savedAudios: [],
  collections: [],
  loading: false,
  error: null,
};

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop";

export const formatBackendPost = (p: any): Post => {
  // A null/undefined likeCount means the owner hid it (viewers only). Numeric → visible.
  const likeHidden = p.hideLikeCount === true || p.likeCount === null;
  const likeCount = typeof p.likeCount === "number" ? p.likeCount : (Array.isArray(p.likes) ? p.likes.length : 0);

  return {
    id: p.id || p.postId,
    userId: p.userId || p.userProfileId || "",
    username: p.userName || p.username || "user",
    avatar: getFullImageUrl(p.userAvatar || p.userImage),
    location: typeof p.location === "object" && p.location
      ? [p.location.city, p.location.country].filter(Boolean).join(", ")
      : (p.locationName || p.location || ""),
    // Reels store the playable file in images[0]/videoUrl and a static thumbnail in coverUrl —
    // `image` must resolve to something an <img>/SmartImage can actually render.
    image: getFullImageUrl(p.coverUrl || (p.images && p.images[0]) || p.filePath || p.imagePath || p.image) || DEFAULT_AVATAR,
    isReel: !!p.isReel,
    videoUrl: p.isReel ? getFullImageUrl(p.videoUrl || (p.images && p.images[0])) : undefined,
    caption: p.content || p.title || p.caption || "",
    likes: likeCount,
    time: p.createAt ? new Date(p.createAt).toLocaleDateString() : "Just now",
    // Backend now returns these directly on the post object, based on the JWT-authenticated user.
    isLiked: !!p.isLiked,
    isSaved: !!p.isSaved,
    // Comments are open unless the author explicitly disabled them.
    allowComments: p.allowComments !== false,
    commentPermission: p.commentPermission || "EVERYONE",
    isArchived: !!p.isArchived,
    hideLikeCount: likeHidden,
    isSensitive: !!p.isSensitive,
    isBlurred: !!p.isBlurred,
    repostedFrom: p.originalPost?.userName || p.repostedFrom || p.originalAuthor || undefined,
    repostedFromUserId: p.originalPost?.userId || p.repostedFromUserId || undefined,
    collabUser: (p.collaborators && p.collaborators[0])
      ? (p.collaborators[0].userName || p.collaborators[0].username)
      : p.collabUser,
    collaborators: (p.collaborators || []).map((t: any): TaggedUser => ({
      userId: t.userId || t.id || "",
      username: t.userName || t.username || "user",
      avatar: getFullImageUrl(t.userAvatar || t.avatar || t.userImage),
    })),
    taggedUsers: (p.taggedUsers || p.tags || []).map((t: any): TaggedUser => ({
      userId: t.userId || t.id || "",
      username: t.userName || t.username || "user",
      avatar: getFullImageUrl(t.userAvatar || t.avatar || t.userImage),
    })),
    comments: (p.comments || []).map(formatComment),
    isPinnedToProfile: !!p.isPinnedToProfile,
    isAgeRestricted: !!p.isAgeRestricted,
    allowStorySharing: p.allowStorySharing !== false,
    isForCloseFriends: !!p.isForCloseFriends,
    locationId: p.locationId ?? null,
    images: Array.isArray(p.images) ? p.images.map((img: string) => getFullImageUrl(img)) : undefined,
    altText: (Array.isArray(p.altTexts) ? p.altTexts[0] : undefined) || p.altText || undefined,
    productTags: Array.isArray(p.productTags) ? p.productTags : [],
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
  async (params: { pageNumber?: number; pageSize?: number; collectionId?: number } = {}, { rejectWithValue }) => {
    try {
      const res = await api.profile.getPostFavorites(params.pageNumber, params.pageSize, params.collectionId);
      const list = Array.isArray(res) ? res : res?.data || [];
      return list.map(formatBackendPost);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load saved posts.");
    }
  }
);

export const fetchCollections = createAsyncThunk(
  "posts/fetchCollections",
  async (_, { rejectWithValue }) => {
    try {
      const list = await api.collection.getCollections();
      return list.map(formatCollection);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load collections.");
    }
  }
);

export const createCollection = createAsyncThunk(
  "posts/createCollection",
  async (name: string, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.collection.createCollection(name);
      dispatch(fetchCollections());
      return res;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to create collection.");
    }
  }
);

export const renameCollection = createAsyncThunk(
  "posts/renameCollection",
  async ({ collectionId, name }: { collectionId: number; name: string }, { rejectWithValue }) => {
    try {
      await api.collection.updateCollection(collectionId, name);
      return { collectionId, name };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to rename collection.");
    }
  }
);

export const deleteCollection = createAsyncThunk(
  "posts/deleteCollection",
  async (collectionId: number, { rejectWithValue }) => {
    try {
      await api.collection.deleteCollection(collectionId);
      return collectionId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete collection.");
    }
  }
);

export const fetchReels = createAsyncThunk(
  "posts/fetchReels",
  async (params: { pageNumber?: number; pageSize?: number } = {}, { rejectWithValue }) => {
    try {
      // The trending feed is the primary source; fall back to the plain reels list if it is unavailable.
      let list;
      try {
        list = await api.post.getTrendingReels();
      } catch {
        list = await api.post.getReels(params.pageNumber, params.pageSize);
      }
      return list; // Raw reels — formatted in the Reels page (it carries audio/video-specific fields).
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load reels.");
    }
  }
);

export const fetchSavedAudios = createAsyncThunk(
  "posts/fetchSavedAudios",
  async (_, { rejectWithValue }) => {
    try {
      const list = await api.post.getSavedAudios();
      return (list || []).map((a: any): SavedAudio => ({
        audioId: String(a.audioId ?? a.id ?? ""),
        title: a.title || "Оригинальный звук",
        artist: a.artist || "",
        audioUrl: getFullImageUrl(a.audioUrl || a.url),
      }));
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load saved audios.");
    }
  }
);

export const saveAudio = createAsyncThunk(
  "posts/saveAudio",
  async (
    audio: { audioId: string; title: string; artist: string; audioUrl: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await api.post.saveAudio(audio.audioId, {
        title: audio.title,
        artist: audio.artist,
        audioUrl: audio.audioUrl,
      });
      dispatch(fetchSavedAudios());
      return audio;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to save audio.");
    }
  }
);

export const createPost = createAsyncThunk(
  "posts/create",
  async (
    data: {
      title: string;
      content: string;
      images: File[];
      isReel?: boolean;
      taggedUserIds?: string[];
      collaboratorIds?: string[];
      isSensitive?: boolean;
      hideLikeCount?: boolean;
      isForCloseFriends?: boolean;
      locationId?: number;
      productTags?: { name: string; price: number; currency: string; url?: string; x: number; y: number }[];
      altTexts?: string[];
    },
    { dispatch, rejectWithValue }
  ) => {
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

export const createReel = createAsyncThunk(
  "posts/createReel",
  async (
    data: { file: File; caption?: string; audioId?: string; audioName?: string; audioArtist?: string; remixOfPostId?: number },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const res = await api.post.addReel(data);
      dispatch(fetchReels({}));
      return res;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to upload reel.");
    }
  }
);

export const togglePostComments = createAsyncThunk(
  "posts/toggleComments",
  async ({ postId, allowComments }: { postId: number; allowComments: boolean }, { rejectWithValue }) => {
    try {
      await api.post.toggleComments(postId, allowComments);
      return { postId, allowComments };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle comments.");
    }
  }
);

export const updateCommentPermission = createAsyncThunk(
  "posts/updateCommentPermission",
  async (
    { postId, commentPermission }: { postId: number; commentPermission: "EVERYONE" | "FOLLOWING" | "FOLLOWERS" },
    { rejectWithValue }
  ) => {
    try {
      await api.post.updateCommentPermission(postId, commentPermission);
      return { postId, commentPermission };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to update comment permission.");
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
  async (
    data: { postId: number; comment: string; username: string; userId: string; parentCommentId?: number },
    { rejectWithValue }
  ) => {
    try {
      const res = await api.post.addComment({
        postId: data.postId,
        comment: data.comment,
        parentCommentId: data.parentCommentId,
      });
      // Prefer the server-assigned id so a fresh comment/reply can be liked immediately.
      const newId = res?.id ?? res?.commentId ?? res?.data?.id ?? Date.now();
      return { ...data, id: newId };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to add comment.");
    }
  }
);

export const likeComment = createAsyncThunk(
  "posts/likeComment",
  async (
    { postId, commentId, wasLiked }: { postId: number; commentId: number; wasLiked: boolean },
    { rejectWithValue }
  ) => {
    try {
      await api.post.likeComment(commentId);
      return { postId, commentId, isLiked: !wasLiked };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to like comment.");
    }
  }
);

export const fetchComments = createAsyncThunk(
  "posts/fetchComments",
  async (postId: number, { rejectWithValue }) => {
    try {
      const list = await api.post.getComments(postId);
      const comments = (list || []).map(formatComment);
      return { postId, comments };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch comments.");
    }
  }
);

export const deleteComment = createAsyncThunk(
  "posts/deleteComment",
  async ({ postId, commentId }: { postId: number; commentId: number }, { rejectWithValue }) => {
    try {
      await api.post.deleteComment(commentId);
      return { postId, commentId };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete comment.");
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

export const repostPost = createAsyncThunk(
  "posts/repost",
  async ({ postId, caption }: { postId: number; caption?: string }, { dispatch, rejectWithValue }) => {
    try {
      const res = await api.post.repost({ postId, caption });
      dispatch(fetchFollowingPosts({}));
      return res;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to repost.");
    }
  }
);

export const pinComment = createAsyncThunk(
  "posts/pinComment",
  async (
    { postId, commentId, isPinned }: { postId: number; commentId: number; isPinned: boolean },
    { rejectWithValue }
  ) => {
    try {
      await api.post.pinComment(commentId, isPinned);
      return { postId, commentId, isPinned };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to pin comment.");
    }
  }
);

export const toggleLikeCountVisibility = createAsyncThunk(
  "posts/toggleLikeCount",
  async ({ postId, hideLikeCount }: { postId: number; hideLikeCount: boolean }, { rejectWithValue }) => {
    try {
      await api.post.toggleLikeCount(postId, hideLikeCount);
      return { postId, hideLikeCount };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle like count.");
    }
  }
);

export const toggleSensitive = createAsyncThunk(
  "posts/toggleSensitive",
  async ({ postId, isSensitive }: { postId: number; isSensitive: boolean }, { rejectWithValue }) => {
    try {
      await api.post.toggleSensitive(postId, isSensitive);
      return { postId, isSensitive };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle sensitive.");
    }
  }
);

/** Locally lift the blur on a post the viewer chose to "View anyway". */
export const revealSensitivePost = createAction<number>("posts/revealSensitive");

export const updatePostCaption = createAsyncThunk(
  "posts/updateCaption",
  async ({ postId, caption }: { postId: number; caption: string }, { rejectWithValue }) => {
    try {
      await api.post.updatePost({ postId, title: caption, content: caption });
      return { postId, caption };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to update post.");
    }
  }
);

export const archivePost = createAsyncThunk(
  "posts/archive",
  async ({ postId, isArchived }: { postId: number; isArchived: boolean }, { rejectWithValue }) => {
    try {
      await api.post.archivePost(postId, isArchived);
      return { postId, isArchived };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to archive post.");
    }
  }
);

export const pinPostToProfile = createAsyncThunk(
  "posts/pinToProfile",
  async ({ postId, isPinned }: { postId: number; isPinned: boolean }, { rejectWithValue }) => {
    try {
      await api.post.pinToProfile(postId, isPinned);
      return { postId, isPinned };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to pin post.");
    }
  }
);

export const toggleAgeRestricted = createAsyncThunk(
  "posts/toggleAgeRestricted",
  async ({ postId, isAgeRestricted }: { postId: number; isAgeRestricted: boolean }, { rejectWithValue }) => {
    try {
      await api.post.toggleAgeRestricted(postId, isAgeRestricted);
      return { postId, isAgeRestricted };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle age-restriction.");
    }
  }
);

export const toggleStorySharing = createAsyncThunk(
  "posts/toggleStorySharing",
  async ({ postId, allowStorySharing }: { postId: number; allowStorySharing: boolean }, { rejectWithValue }) => {
    try {
      await api.post.toggleStorySharing(postId, allowStorySharing);
      return { postId, allowStorySharing };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to toggle story sharing.");
    }
  }
);

export const bulkArchivePosts = createAsyncThunk(
  "posts/bulkArchive",
  async ({ postIds, isArchived }: { postIds: number[]; isArchived: boolean }, { dispatch, rejectWithValue }) => {
    try {
      await api.post.bulkArchive(postIds, isArchived);
      dispatch(fetchMyPosts());
      dispatch(fetchArchivedPosts());
      return { postIds, isArchived };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to archive posts.");
    }
  }
);

export const bulkDeletePosts = createAsyncThunk(
  "posts/bulkDelete",
  async (postIds: number[], { rejectWithValue }) => {
    try {
      await api.post.bulkDelete(postIds);
      return postIds;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete posts.");
    }
  }
);

export const updatePostMedia = createAsyncThunk(
  "posts/updateMedia",
  async ({ postId, keepImages, newImages }: { postId: number; keepImages: string[]; newImages: File[] }, { rejectWithValue }) => {
    try {
      const res = await api.post.updatePostMedia(postId, keepImages, newImages);
      return formatBackendPost(res);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to update post media.");
    }
  }
);

export const markNotInterested = createAsyncThunk(
  "posts/notInterested",
  async (data: { postId: number; alsoMuteAuthor?: boolean; alsoMuteHashtags?: boolean }, { rejectWithValue }) => {
    try {
      await api.post.notInterested(data);
      return data.postId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to save preference.");
    }
  }
);

export const fetchArchivedPosts = createAsyncThunk(
  "posts/fetchArchived",
  async (_, { rejectWithValue }) => {
    try {
      const list = await api.post.getArchivedPosts();
      return list.map(formatBackendPost);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load archived posts.");
    }
  }
);

export const fetchTaggedPosts = createAsyncThunk(
  "posts/fetchTagged",
  async (userId: string, { rejectWithValue }) => {
    try {
      const list = await api.post.getTaggedPosts(userId);
      return list.map(formatBackendPost);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load tagged posts.");
    }
  }
);

export const addPostFavorite = createAsyncThunk(
  "posts/favorite",
  // Accepts a bare postId (back-compat) or { postId, collectionId } to save into a folder.
  async (arg: number | { postId: number; collectionId?: number }, { rejectWithValue }) => {
    const postId = typeof arg === "number" ? arg : arg.postId;
    const collectionId = typeof arg === "number" ? undefined : arg.collectionId;
    try {
      await api.post.addPostFavorite({ postId, collectionId });
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
      .addCase(fetchFollowingPosts.pending, (state, action) => {
        // Only the first page shows the full-feed skeleton; later pages append quietly
        // underneath the already-rendered feed (infinite scroll).
        if ((action.meta.arg?.pageNumber ?? 1) <= 1) {
          state.loading = true;
          state.error = null;
        }
      })
      .addCase(fetchFollowingPosts.fulfilled, (state, action) => {
        state.loading = false;
        if ((action.meta.arg?.pageNumber ?? 1) > 1) {
          // Append, skipping any post already in the feed (guards against a backend that
          // ignores pagination and re-returns the same rows).
          const seen = new Set(state.posts.map((p) => p.id));
          state.posts.push(...action.payload.filter((p) => !seen.has(p.id)));
        } else {
          state.posts = action.payload;
        }
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

      // Fetch Saved Audios
      .addCase(fetchSavedAudios.fulfilled, (state, action: PayloadAction<SavedAudio[]>) => {
        state.savedAudios = action.payload;
      })

      // Saved collections
      .addCase(fetchCollections.fulfilled, (state, action: PayloadAction<Collection[]>) => {
        state.collections = action.payload;
      })
      .addCase(deleteCollection.fulfilled, (state, action: PayloadAction<number>) => {
        state.collections = state.collections.filter((c) => c.id !== action.payload);
      })
      .addCase(renameCollection.fulfilled, (state, action: PayloadAction<{ collectionId: number; name: string }>) => {
        const col = state.collections.find((c) => c.id === action.payload.collectionId);
        if (col) col.name = action.payload.name;
      })

      // Toggle Comments (author only)
      .addCase(togglePostComments.fulfilled, (state, action) => {
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === action.payload.postId);
          if (post) post.allowComments = action.payload.allowComments;
        });
      })

      // Comment permission (author only) — WHO may comment
      .addCase(updateCommentPermission.fulfilled, (state, action) => {
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === action.payload.postId);
          if (post) post.commentPermission = action.payload.commentPermission;
        });
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

      // Fetch Comments
      .addCase(fetchComments.fulfilled, (state, action) => {
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === action.payload.postId);
          if (post) {
            post.comments = action.payload.comments;
          }
        });
      })

      // Add Comment (top-level) or Reply (when parentCommentId is set)
      .addCase(addComment.fulfilled, (state, action) => {
        const { postId, parentCommentId, id, userId, username, comment } = action.payload;
        const newComment: Comment = {
          id,
          userId,
          username,
          text: comment,
          likeCount: 0,
          isLiked: false,
          parentCommentId: parentCommentId ?? null,
          replyCount: 0,
          replies: [],
        };
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (!post) return;
          if (parentCommentId != null) {
            const parent = post.comments.find((c) => c.id === parentCommentId);
            if (parent) {
              parent.replies.push(newComment);
              parent.replyCount += 1;
            }
          } else {
            post.comments.push(newComment);
          }
        });
      })

      // Like / unlike a comment or reply (backend toggles)
      .addCase(likeComment.fulfilled, (state, action) => {
        const { postId, commentId, isLiked } = action.payload;
        const apply = (c: Comment) => {
          c.isLiked = isLiked;
          c.likeCount = Math.max(0, c.likeCount + (isLiked ? 1 : -1));
        };
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (!post) return;
          for (const c of post.comments) {
            if (c.id === commentId) { apply(c); return; }
            const reply = c.replies.find((r) => r.id === commentId);
            if (reply) { apply(reply); return; }
          }
        });
      })

      // Delete Comment or reply
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { postId, commentId } = action.payload;
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (!post) return;
          const before = post.comments.length;
          post.comments = post.comments.filter((c) => c.id !== commentId);
          if (post.comments.length === before) {
            // Not a top-level comment — try removing it from a parent's replies.
            for (const c of post.comments) {
              const idx = c.replies.findIndex((r) => r.id === commentId);
              if (idx !== -1) {
                c.replies.splice(idx, 1);
                c.replyCount = Math.max(0, c.replyCount - 1);
                break;
              }
            }
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
        state.archivedPosts = state.archivedPosts.filter((p) => p.id !== action.payload);
      })

      // Edit caption
      .addCase(updatePostCaption.fulfilled, (state, action) => {
        const { postId, caption } = action.payload;
        [state.posts, state.myPosts, state.savedPosts, state.archivedPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (post) post.caption = caption;
        });
      })

      // #13 Pin / unpin a comment — set the flag and float pinned comments to the top.
      .addCase(pinComment.fulfilled, (state, action) => {
        const { postId, commentId, isPinned } = action.payload;
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (!post) return;
          const c = post.comments.find((x) => x.id === commentId);
          if (c) c.isPinned = isPinned;
          post.comments = [...post.comments].sort(
            (a, b) => Number(!!b.isPinned) - Number(!!a.isPinned)
          );
        });
      })

      // #14 Hide / show like count
      .addCase(toggleLikeCountVisibility.fulfilled, (state, action) => {
        const { postId, hideLikeCount } = action.payload;
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (post) post.hideLikeCount = hideLikeCount;
        });
      })

      // #24 Mark / unmark sensitive
      .addCase(toggleSensitive.fulfilled, (state, action) => {
        const { postId, isSensitive } = action.payload;
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (post) {
            post.isSensitive = isSensitive;
            post.isBlurred = isSensitive;
          }
        });
      })

      // #24 Viewer chose "View anyway" — lift the blur locally
      .addCase(revealSensitivePost, (state, action: PayloadAction<number>) => {
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const post = list.find((p) => p.id === action.payload);
          if (post) post.isBlurred = false;
        });
      })

      // Archive / unarchive
      .addCase(archivePost.fulfilled, (state, action) => {
        const { postId, isArchived } = action.payload;
        if (isArchived) {
          // Moving a post into the archive hides it from every visible feed.
          const moved = state.myPosts.find((p) => p.id === postId);
          state.posts = state.posts.filter((p) => p.id !== postId);
          state.myPosts = state.myPosts.filter((p) => p.id !== postId);
          if (moved && !state.archivedPosts.some((p) => p.id === postId)) {
            state.archivedPosts.unshift({ ...moved, isArchived: true });
          }
        } else {
          // Restoring pulls it back onto the profile grid.
          const moved = state.archivedPosts.find((p) => p.id === postId);
          state.archivedPosts = state.archivedPosts.filter((p) => p.id !== postId);
          if (moved && !state.myPosts.some((p) => p.id === postId)) {
            state.myPosts.unshift({ ...moved, isArchived: false });
          }
        }
      })

      // Fetch archived posts
      .addCase(fetchArchivedPosts.fulfilled, (state, action: PayloadAction<Post[]>) => {
        state.archivedPosts = action.payload;
      })

      // Pin / unpin to profile — max 3, sorted pinned-first
      .addCase(pinPostToProfile.fulfilled, (state, action) => {
        const { postId, isPinned } = action.payload;
        [state.posts, state.myPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (post) post.isPinnedToProfile = isPinned;
          list.sort((a, b) => Number(!!b.isPinnedToProfile) - Number(!!a.isPinnedToProfile));
        });
      })

      // Age-restricted / story-sharing toggles
      .addCase(toggleAgeRestricted.fulfilled, (state, action) => {
        const { postId, isAgeRestricted } = action.payload;
        [state.posts, state.myPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (post) post.isAgeRestricted = isAgeRestricted;
        });
      })
      .addCase(toggleStorySharing.fulfilled, (state, action) => {
        const { postId, allowStorySharing } = action.payload;
        [state.posts, state.myPosts].forEach((list) => {
          const post = list.find((p) => p.id === postId);
          if (post) post.allowStorySharing = allowStorySharing;
        });
      })

      // Bulk archive / delete (multi-select on the profile grid)
      .addCase(bulkArchivePosts.fulfilled, (state, action) => {
        const { postIds, isArchived } = action.payload;
        if (isArchived) {
          state.myPosts = state.myPosts.filter((p) => !postIds.includes(p.id));
          state.posts = state.posts.filter((p) => !postIds.includes(p.id));
        }
      })
      .addCase(bulkDeletePosts.fulfilled, (state, action: PayloadAction<number[]>) => {
        [state.posts, state.myPosts, state.savedPosts, state.archivedPosts].forEach((list, i) => {
          const filtered = list.filter((p) => !action.payload.includes(p.id));
          if (i === 0) state.posts = filtered;
          else if (i === 1) state.myPosts = filtered;
          else if (i === 2) state.savedPosts = filtered;
          else state.archivedPosts = filtered;
        });
      })

      // Carousel media edit
      .addCase(updatePostMedia.fulfilled, (state, action: PayloadAction<Post>) => {
        [state.posts, state.myPosts, state.savedPosts].forEach((list) => {
          const idx = list.findIndex((p) => p.id === action.payload.id);
          if (idx !== -1) list[idx] = { ...list[idx], image: action.payload.image, images: action.payload.images };
        });
      })

      // "Not interested" — collapse from the feed
      .addCase(markNotInterested.fulfilled, (state, action: PayloadAction<number>) => {
        state.posts = state.posts.filter((p) => p.id !== action.payload);
      })

      // Fetch tagged posts
      .addCase(fetchTaggedPosts.fulfilled, (state, action: PayloadAction<Post[]>) => {
        state.taggedPosts = action.payload;
      });
  },
});

export default postsSlice.reducer;
