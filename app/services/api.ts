import axios, { Method } from "axios";

/**
 * API Service Client for Instagram Backend
 * Base URL: https://instaback-cw0j.onrender.com
 */

let rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
if (rawBaseUrl.includes("/swagger")) {
  rawBaseUrl = rawBaseUrl.split("/swagger")[0];
}
export const BASE_URL = rawBaseUrl;

/**
 * Resolves any avatar / post / story / reel / chat media reference to a usable URL,
 * regardless of what shape the backend hands us:
 *   - falsy                      -> "" (callers render their own placeholder / fallback)
 *   - absolute (http/https)      -> returned unchanged. This is what prevents
 *                                   double-prefixing now that the API returns full
 *                                   Cloudinary URLs (e.g. https://res.cloudinary.com/...).
 *   - local object/data URL      -> returned unchanged (blob:/data: upload previews)
 *   - legacy relative "/uploads" -> prefixed with the backend base URL
 */
export function getFullImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  const trimmed = path.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${BASE_URL}${cleanPath}`;
}

/**
 * Canonical name for the media URL resolver. `getFullImageUrl` is the original name
 * kept for its existing call sites; both are the same function.
 */
export const resolveMediaUrl = getFullImageUrl;

export class ApiError extends Error {
  status: number;
  errors?: string[];

  constructor(status: number, message: string, errors?: string[]) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.name = "ApiError";
  }
}

// Local storage token keys
const TOKEN_KEY = "instagram_access_token";

export function getStoredToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function setStoredToken(token: string | null): void {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

// Generic Request Wrapper using Axios
async function request<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: any;
  } = {}
): Promise<T> {
  const token = getStoredToken();
  const headers = { ...options.headers };

  // Add authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Set Content-Type to application/json by default, unless it's FormData
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  try {
    const response = await axios({
      url,
      method: (options.method || "GET") as Method,
      data: options.body,
      headers,
      validateStatus: () => true,
    });

    if (response.status === 401) {
      // Clear token on unauthorized
      setStoredToken(null);
      // Try to redirect to login on client side if necessary, or throw
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("api-unauthorized"));
      }
      throw new ApiError(401, "Unauthorized access. Please log in.");
    }

    if (response.status === 403) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("api-forbidden"));
      }
      throw new ApiError(403, "Forbidden. You do not have permission.");
    }

    if (response.status === 404) {
      throw new ApiError(404, "Requested resource not found.");
    }

    const result = response.data;

    if (response.status < 200 || response.status >= 300) {
      const errorMsg = result?.errors?.[0] || result?.message || `Request failed with status ${response.status}`;
      throw new ApiError(response.status, errorMsg, result?.errors);
    }

    // Swagger responses are wrapped: { data: T, errors: string[], statusCode: number }
    // Sometimes it is direct. We handle both:
    if (result && typeof result === "object" && "statusCode" in result) {
      if (result.errors && result.errors.length > 0) {
        throw new ApiError(result.statusCode || 400, result.errors[0], result.errors);
      }
      return result.data as T;
    }
    return result as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network/Proxy errors
    throw new ApiError(502, err.message || "Network error. Please check your connection.");
  }
}


// API Endpoints Mapping
export const api = {
  // --- ACCOUNT ENDPOINTS ---
  account: {
    async register(data: any): Promise<any> {
      return request("/Account/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async login(data: any): Promise<{ token: string; reactivated?: boolean }> {
      // Plain string when the account was already active, or { token, reactivated: true }
      // when logging back in auto-reactivated a deactivated/pending-deletion account.
      const res = await request<any>("/Account/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      const token = typeof res === "string" ? res : res?.token || res?.data || res;
      const reactivated = typeof res === "object" && res !== null ? !!res.reactivated : false;
      if (token && typeof token === "string") {
        setStoredToken(token);
      }
      return { token, reactivated };
    },

    async forgotPassword(email: string): Promise<any> {
      return request(`/Account/ForgotPassword?Email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
    },

    async resetPassword(params: any): Promise<any> {
      const query = new URLSearchParams(params).toString();
      return request(`/Account/ResetPassword?${query}`, {
        method: "DELETE",
      });
    },

    async changePassword(params: any): Promise<any> {
      const query = new URLSearchParams(params).toString();
      return request(`/Account/ChangePassword?${query}`, {
        method: "PUT",
      });
    },

    async getActiveSessions(): Promise<any[]> {
      const res = await request<any>("/Account/get-active-sessions");
      return Array.isArray(res) ? res : res?.data || [];
    },

    /** Live check while typing in Edit Profile — excludes the caller's own current username. */
    async checkUsernameAvailability(userName: string): Promise<{ userName: string; isAvailable: boolean }> {
      return request(`/Account/check-username-availability?userName=${encodeURIComponent(userName)}`);
    },

    /** Reverse-chronological security events: ACCOUNT_CREATED, LOGIN, PASSWORD_CHANGED, etc. */
    async getSecurityLog(): Promise<any[]> {
      const res = await request<any>("/Account/get-security-log");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async requestDeletion(): Promise<any> {
      return request("/Account/request-deletion", { method: "POST" });
    },

    async cancelDeletion(): Promise<any> {
      return request("/Account/cancel-deletion", { method: "DELETE" });
    },

    async exportData(): Promise<any> {
      return request("/Account/export-data");
    },

    async logoutSession(sessionId: string): Promise<any> {
      return request("/Account/logout-session", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
    },

    /** #22 — temporarily deactivate; server auto-reactivates on next successful login. */
    async deactivate(): Promise<any> {
      return request("/Account/deactivate", { method: "PUT" });
    },

    // --- MULTI-ACCOUNT SWITCHING (feature #23) ---
    async addLinkedAccount(userName: string, password: string): Promise<any> {
      return request("/Account/add-linked-account", {
        method: "POST",
        body: JSON.stringify({ userName, password }),
      });
    },
    async getLinkedAccounts(): Promise<any[]> {
      const res = await request<any>("/Account/get-linked-accounts");
      return Array.isArray(res) ? res : res?.data || [];
    },
    /** Returns a fresh token for the target account (no password once linked). */
    async switchAccount(userId: string): Promise<string> {
      const res = await request<any>("/Account/switch-account", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      const token = typeof res === "string" ? res : res?.token || res?.data || res;
      if (token && typeof token === "string") {
        setStoredToken(token);
      }
      return token;
    },
  },

  // --- USER PROFILE ENDPOINTS ---
  profile: {
    async getMyProfile(): Promise<any> {
      return request("/UserProfile/get-my-profile");
    },

    async getUserProfileById(id: string): Promise<any> {
      return request(`/UserProfile/get-user-profile-by-id?userId=${id}`);
    },

    async getIsFollowUserProfileById(followingUserId: string): Promise<boolean> {
      return request(`/UserProfile/get-is-follow-user-profile-by-id?followingUserId=${followingUserId}`);
    },

    async updateUserProfile(data: { about?: string; gender?: number; fullName?: string; website?: string; pronouns?: string }): Promise<any> {
      return request("/UserProfile/update-user-profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    /** Live-checked in Edit Profile before submitting; keeps a server-side history. */
    async updateUsername(userName: string): Promise<any> {
      return request(`/UserProfile/update-username?userName=${encodeURIComponent(userName)}`, {
        method: "PUT",
      });
    },

    async getShareLink(userId: string): Promise<{ webUrl: string; deepLink: string }> {
      return request(`/UserProfile/get-share-link?userId=${userId}`);
    },

    /** Mutual: turning yours off also hides everyone else's lastSeenAt from you. */
    async updateActivityStatusVisibility(showActivityStatus: boolean): Promise<any> {
      return request(`/UserProfile/update-activity-status-visibility?showActivityStatus=${showActivityStatus}`, {
        method: "PUT",
      });
    },

    async getPostFavorites(pageNumber = 1, pageSize = 20, collectionId?: number): Promise<any> {
      const q = new URLSearchParams({ PageNumber: String(pageNumber), PageSize: String(pageSize) });
      if (collectionId != null) q.append("collectionId", String(collectionId));
      return request(`/UserProfile/get-post-favorites?${q.toString()}`);
    },

    async updatePrivacy(isPrivate: boolean): Promise<any> {
      return request(`/UserProfile/update-privacy?isPrivate=${isPrivate}`, {
        method: "PUT",
      });
    },

    /** Viewer's sensitive-content preference. Feature #24. */
    async updateSensitiveContentSetting(level: "SHOW" | "BLUR" | "HIDE"): Promise<any> {
      return request(`/UserProfile/update-sensitive-content-setting?level=${level}`, {
        method: "PUT",
      });
    },

    /** Switch account type (feature #20). */
    async updateAccountType(accountType: "PERSONAL" | "BUSINESS" | "CREATOR"): Promise<any> {
      return request(`/UserProfile/update-account-type?accountType=${accountType}`, {
        method: "PUT",
      });
    },

    /** Professional insights — Business/Creator accounts only (feature #20). */
    async getInsights(): Promise<any> {
      return request("/UserProfile/get-insights");
    },

    async updateUserImageProfile(file: File): Promise<any> {
      const formData = new FormData();
      formData.append("imageFile", file);
      return request("/UserProfile/update-user-image-profile", {
        method: "PUT",
        body: formData,
      });
    },

    async deleteUserImageProfile(): Promise<any> {
      return request("/UserProfile/delete-user-image-profile", {
        method: "DELETE",
      });
    },
  },

  // --- POST ENDPOINTS ---
  post: {
    async getPosts(params: {
      userId?: string;
      title?: string;
      content?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}): Promise<any[]> {
      const query = new URLSearchParams();
      if (params.userId) query.append("UserId", params.userId);
      if (params.title) query.append("Title", params.title);
      if (params.content) query.append("Content", params.content);
      if (params.pageNumber) query.append("PageNumber", String(params.pageNumber));
      if (params.pageSize) query.append("PageSize", String(params.pageSize));

      const res = await request<any>(`/Post/get-posts?${query.toString()}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getReels(pageNumber = 1, pageSize = 12): Promise<any[]> {
      const res = await request<any>(`/Post/get-reels?PageNumber=${pageNumber}&PageSize=${pageSize}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getPostById(id: number): Promise<any> {
      return request(`/Post/get-post-by-id?id=${id}`);
    },

    async getMyPosts(includeArchived = false): Promise<any[]> {
      const res = await request<any>(
        `/Post/get-my-posts${includeArchived ? "?includeArchived=true" : ""}`
      );
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getArchivedPosts(): Promise<any[]> {
      const res = await request<any>("/Post/get-archived-posts");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getTaggedPosts(userId: string): Promise<any[]> {
      const res = await request<any>(`/Post/get-tagged-posts?userId=${userId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getFollowingPost(params: {
      userId?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}): Promise<any[]> {
      const query = new URLSearchParams();
      if (params.userId) query.append("UserId", params.userId);
      if (params.pageNumber) query.append("PageNumber", String(params.pageNumber));
      if (params.pageSize) query.append("PageSize", String(params.pageSize));

      const res = await request<any>(`/Post/get-following-post?${query.toString()}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async addPost(data: {
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
    }): Promise<any> {
      const formData = new FormData();
      formData.append("Title", data.title);
      formData.append("Content", data.content);
      if (data.isReel) {
        formData.append("isReel", "true");
      }
      // The backend binds single JSON-array strings of user ids (staged as pending).
      if (data.taggedUserIds && data.taggedUserIds.length > 0) {
        formData.append("taggedUserIds", JSON.stringify(data.taggedUserIds));
      }
      if (data.collaboratorIds && data.collaboratorIds.length > 0) {
        formData.append("collaboratorIds", JSON.stringify(data.collaboratorIds));
      }
      if (data.isSensitive) formData.append("isSensitive", "true");
      if (data.hideLikeCount) formData.append("hideLikeCount", "true");
      if (data.isForCloseFriends) formData.append("isForCloseFriends", "true");
      if (data.locationId != null) formData.append("locationId", String(data.locationId));
      if (data.productTags && data.productTags.length > 0) {
        formData.append("productTags", JSON.stringify(data.productTags));
      }
      data.images.forEach((img) => {
        formData.append("Images", img);
      });

      return request("/Post/add-post", {
        method: "POST",
        body: formData,
      });
    },

    /** Owner-only carousel media editor: `keepImages` is the kept URLs in final order, `newImages` are appended. */
    async updatePostMedia(postId: number, keepImages: string[], newImages: File[]): Promise<any> {
      const formData = new FormData();
      formData.append("postId", String(postId));
      formData.append("keepImages", JSON.stringify(keepImages));
      newImages.forEach((img) => formData.append("Images", img));
      return request("/Post/update-post-media", { method: "PUT", body: formData });
    },

    async bulkArchive(postIds: number[], isArchived: boolean): Promise<any> {
      return request("/Post/bulk-archive", {
        method: "PUT",
        body: JSON.stringify({ postIds, isArchived }),
      });
    },
    async bulkDelete(postIds: number[]): Promise<any> {
      return request("/Post/bulk-delete", {
        method: "DELETE",
        body: JSON.stringify({ postIds }),
      });
    },

    /** Owner only, max 3; get-my-posts/get-posts sort pinned first. */
    async pinToProfile(postId: number, isPinned: boolean): Promise<any> {
      return request(`/Post/pin-to-profile?postId=${postId}&isPinned=${isPinned}`, { method: "PUT" });
    },

    async toggleAgeRestricted(postId: number, isAgeRestricted: boolean): Promise<any> {
      return request(`/Post/toggle-age-restricted?postId=${postId}&isAgeRestricted=${isAgeRestricted}`, { method: "PUT" });
    },

    /** Owner only; disabling 403s share-post-to-story for everyone else. */
    async toggleStorySharing(postId: number, allowStorySharing: boolean): Promise<any> {
      return request(`/Post/toggle-story-sharing?postId=${postId}&allowStorySharing=${allowStorySharing}`, { method: "PUT" });
    },

    async notInterested(data: { postId: number; alsoMuteAuthor?: boolean; alsoMuteHashtags?: boolean }): Promise<any> {
      return request("/Post/not-interested", { method: "POST", body: JSON.stringify(data) });
    },

    // --- SCHEDULED POSTS ---
    async schedulePost(data: {
      title: string;
      content: string;
      images: File[];
      scheduledFor: string;
      isReel?: boolean;
    }): Promise<any> {
      const formData = new FormData();
      formData.append("Title", data.title);
      formData.append("Content", data.content);
      formData.append("scheduledFor", data.scheduledFor);
      if (data.isReel) formData.append("isReel", "true");
      data.images.forEach((img) => formData.append("Images", img));
      return request("/Post/schedule-post", { method: "POST", body: formData });
    },
    /** Auto-publishes any due posts server-side — call on screen open + app foreground. */
    async getScheduledPosts(): Promise<any[]> {
      const res = await request<any>("/Post/get-scheduled-posts");
      return Array.isArray(res) ? res : res?.data || [];
    },
    async updateSchedule(draftId: string, scheduledFor: string): Promise<any> {
      return request("/Post/update-schedule", {
        method: "PUT",
        body: JSON.stringify({ draftId, scheduledFor }),
      });
    },
    async cancelSchedule(draftId: string): Promise<any> {
      return request(`/Post/cancel-schedule?draftId=${draftId}`, { method: "DELETE" });
    },

    // --- EXPLORE (feature #3) ---
    async getExplorePosts(pageNumber = 1, pageSize = 24): Promise<any[]> {
      const res = await request<any>(`/Post/get-explore-posts?PageNumber=${pageNumber}&PageSize=${pageSize}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    // --- TAG APPROVAL (feature #15) ---
    async getTagRequests(): Promise<any[]> {
      const res = await request<any>("/Post/get-tag-requests");
      return Array.isArray(res) ? res : res?.data || [];
    },
    async approveTag(postId: number): Promise<any> {
      return request(`/Post/approve-tag?postId=${postId}`, { method: "PUT" });
    },
    async rejectTag(postId: number): Promise<any> {
      return request(`/Post/reject-tag?postId=${postId}`, { method: "DELETE" });
    },

    // --- COLLABORATORS (feature #16) ---
    async getCollabRequests(): Promise<any[]> {
      const res = await request<any>("/Post/get-collab-requests");
      return Array.isArray(res) ? res : res?.data || [];
    },
    async approveCollab(postId: number): Promise<any> {
      return request(`/Post/approve-collab?postId=${postId}`, { method: "PUT" });
    },
    async rejectCollab(postId: number): Promise<any> {
      return request(`/Post/reject-collab?postId=${postId}`, { method: "DELETE" });
    },

    // --- REPOST (feature #17) ---
    async repost(data: { postId: number; caption?: string }): Promise<any> {
      return request("/Post/repost-post", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    // --- DRAFTS (feature #18) ---
    async saveDraft(data: { title: string; content: string; images: File[]; isReel?: boolean }): Promise<any> {
      const formData = new FormData();
      formData.append("Title", data.title);
      formData.append("Content", data.content);
      if (data.isReel) formData.append("isReel", "true");
      data.images.forEach((img) => formData.append("Images", img));
      return request("/Post/save-draft", { method: "POST", body: formData });
    },
    async getDrafts(): Promise<any[]> {
      const res = await request<any>("/Post/get-drafts");
      return Array.isArray(res) ? res : res?.data || [];
    },
    async deleteDraft(draftId: number): Promise<any> {
      return request(`/Post/delete-draft?draftId=${draftId}`, { method: "DELETE" });
    },
    async publishDraft(draftId: number): Promise<any> {
      return request("/Post/publish-draft", {
        method: "POST",
        body: JSON.stringify({ draftId }),
      });
    },

    /** Edit a post's caption (owner only). Hashtags are recomputed server-side. */
    async updatePost(data: { postId: number; title?: string; content?: string }): Promise<any> {
      return request("/Post/update-post", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    /** Hide/unhide a post from feeds without deleting it (owner only). */
    async archivePost(postId: number, isArchived: boolean): Promise<any> {
      return request(`/Post/archive-post?postId=${postId}&isArchived=${isArchived}`, {
        method: "PUT",
      });
    },

    async deletePost(id: number): Promise<any> {
      return request(`/Post/delete-post?id=${id}`, {
        method: "DELETE",
      });
    },

    async likePost(postId: number): Promise<any> {
      return request(`/Post/like-post?postId=${postId}`, {
        method: "POST",
      });
    },

    async viewPost(postId: number): Promise<any> {
      return request(`/Post/view-post?postId=${postId}`, {
        method: "POST",
      });
    },

    async getComments(postId: number): Promise<any[]> {
      const res = await request<any>(`/Post/get-comments?postId=${postId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async addComment(data: { postId: number; comment: string; parentCommentId?: number }): Promise<any> {
      return request("/Post/add-comment", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    /** Toggles a like on a comment or reply. */
    async likeComment(commentId: number): Promise<any> {
      return request(`/Post/like-comment?commentId=${commentId}`, {
        method: "POST",
      });
    },

    /** Pin/unpin a comment (post author only, max 3). Feature #13. */
    async pinComment(commentId: number, isPinned: boolean): Promise<any> {
      return request(`/Post/pin-comment?commentId=${commentId}&isPinned=${isPinned}`, {
        method: "POST",
      });
    },

    /** Hide/show the like count on a post (owner only). Feature #14. */
    async toggleLikeCount(postId: number, hideLikeCount: boolean): Promise<any> {
      return request(`/Post/toggle-like-count?postId=${postId}&hideLikeCount=${hideLikeCount}`, {
        method: "PUT",
      });
    },

    /** Mark/unmark a post as sensitive (owner). Feature #24. */
    async toggleSensitive(postId: number, isSensitive: boolean): Promise<any> {
      return request(`/Post/toggle-sensitive?postId=${postId}&isSensitive=${isSensitive}`, {
        method: "PUT",
      });
    },

    /** Owner-only per-post stat tiles. */
    async getPostInsights(postId: number): Promise<any> {
      return request(`/Post/get-post-insights?postId=${postId}`);
    },

    async deleteComment(commentId: number): Promise<any> {
      return request(`/Post/delete-comment?commentId=${commentId}`, {
        method: "DELETE",
      });
    },

    async addPostFavorite(data: { postId: number; collectionId?: number }): Promise<any> {
      return request("/Post/add-post-favorite", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async addReel(data: {
      file: File;
      caption?: string;
      audioId?: string;
      audioName?: string;
      audioArtist?: string;
      remixOfPostId?: number;
    }): Promise<any> {
      const formData = new FormData();
      formData.append("File", data.file);
      if (data.caption) formData.append("caption", data.caption);
      if (data.audioId) formData.append("audioId", data.audioId);
      if (data.audioName) formData.append("audioName", data.audioName);
      if (data.audioArtist) formData.append("audioArtist", data.audioArtist);
      if (data.remixOfPostId != null) formData.append("remixOfPostId", String(data.remixOfPostId));

      return request("/Post/add-reel", {
        method: "POST",
        body: formData,
      });
    },

    async getAudioDetails(audioId: string): Promise<any> {
      return request(`/Post/get-audio-details?audioId=${encodeURIComponent(audioId)}`);
    },

    async getTrendingReels(): Promise<any[]> {
      const res = await request<any>("/Post/get-trending-reels");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async saveAudio(audioId: string, data: { title?: string; artist?: string; audioUrl?: string }): Promise<any> {
      return request(`/Post/save-audio/${encodeURIComponent(audioId)}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async getSavedAudios(): Promise<any[]> {
      const res = await request<any>("/Post/get-saved-audios");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async toggleComments(postId: number, allowComments: boolean): Promise<any> {
      return request(`/Post/toggle-comments/${postId}?allowComments=${allowComments}`, {
        method: "PUT",
      });
    },

    async getByHashtag(hashtag: string): Promise<any[]> {
      // The backend indexes tags without the leading '#'.
      const tag = hashtag.replace(/^#/, "");
      const res = await request<any>(`/Post/get-by-hashtag?hashtag=${encodeURIComponent(tag)}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getTrendingHashtags(): Promise<any[]> {
      const res = await request<any>("/Post/get-trending-hashtags");
      return Array.isArray(res) ? res : res?.data || [];
    },

    /** Opens as a standard follower-style list when tapping a post's like count. */
    async getLikers(postId: number): Promise<any[]> {
      const res = await request<any>(`/Post/get-likers?postId=${postId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async followHashtag(hashtag: string): Promise<any> {
      const tag = hashtag.replace(/^#/, "");
      return request(`/Post/follow-hashtag?hashtag=${encodeURIComponent(tag)}`, { method: "POST" });
    },
    async unfollowHashtag(hashtag: string): Promise<any> {
      const tag = hashtag.replace(/^#/, "");
      return request(`/Post/unfollow-hashtag?hashtag=${encodeURIComponent(tag)}`, { method: "DELETE" });
    },
    async getFollowedHashtags(): Promise<string[]> {
      const res = await request<any>("/Post/get-followed-hashtags");
      return Array.isArray(res) ? res : res?.data || [];
    },
  },

  // --- STORY ENDPOINTS ---
  story: {
    async getStories(): Promise<any[]> {
      const res = await request<any>("/Story/get-stories");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getUserStories(userId: string): Promise<any[]> {
      const res = await request<any>(`/Story/get-user-stories/${userId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getMyStories(): Promise<any[]> {
      const res = await request<any>("/Story/get-my-stories");
      return Array.isArray(res) ? res : res?.data || [];
    },

    /** Toggles a like on a story. Pass `reaction` to attach a quick emoji instead of a plain heart. */
    async likeStory(storyId: number, reaction?: string): Promise<any> {
      return request("/Story/LikeStory", {
        method: "POST",
        body: JSON.stringify({ storyId, reaction }),
      });
    },

    /** Vote on a POLL sticker (selectedOptionIndex) or answer a QUESTION sticker (textAnswer). */
    async answerSticker(data: {
      stickerId: number | string;
      selectedOptionIndex?: number;
      textAnswer?: string;
    }): Promise<any> {
      return request("/Story/answer-sticker", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    /** Sticker statistics — the backend only exposes these to the story's author. */
    async getStickerResults(stickerId: number | string): Promise<any> {
      return request(`/Story/sticker-results/${encodeURIComponent(String(stickerId))}`);
    },

    async getStoryById(id: number): Promise<any> {
      return request(`/Story/GetStoryById?id=${id}`);
    },

    /** Returns the created story object directly (id, fileName, audio*, sticker incl. x/y/scale/rotation). */
    async addStory(
      file: File,
      postId?: number,
      isForCloseFriends = false,
      sticker?:
        | { type: "POLL" | "QUESTION"; question: string; options?: string[] }
        | { type: "MENTION"; mentionUserId: string; mentionUsername?: string }
        | { type: "LINK"; url: string; label?: string }
        | { type: "COUNTDOWN"; endsAt: string; label?: string },
      musicTrack?: { id: string; title: string; artist: string; audioUrl: string; coverUrl?: string; durationMs?: number } | null,
      stickerPosition?: { x: number; y: number; scale?: number; rotation?: number } | null
    ): Promise<any> {
      const formData = new FormData();
      formData.append("Image", file);
      formData.append("isForCloseFriends", String(isForCloseFriends));
      if (sticker) {
        formData.append("stickerType", sticker.type);
        if (sticker.type === "MENTION") {
          // Feature #21 — tags a user; they receive a STORY_MENTION notification.
          formData.append("stickerMentionUserId", sticker.mentionUserId);
        } else if (sticker.type === "LINK") {
          formData.append("stickerLinkUrl", sticker.url);
          if (sticker.label) formData.append("stickerLinkLabel", sticker.label);
        } else if (sticker.type === "COUNTDOWN") {
          formData.append("stickerCountdownEndsAt", sticker.endsAt);
          if (sticker.label) formData.append("stickerCountdownLabel", sticker.label);
        } else {
          formData.append("stickerQuestion", sticker.question);
          // A poll's options are a repeated field so the backend binds them as a string[].
          (sticker.options || []).forEach((opt) => formData.append("stickerOptions", opt));
        }
        if (stickerPosition) {
          formData.append("stickerX", String(stickerPosition.x));
          formData.append("stickerY", String(stickerPosition.y));
          if (stickerPosition.scale != null) formData.append("stickerScale", String(stickerPosition.scale));
          if (stickerPosition.rotation != null) formData.append("stickerRotation", String(stickerPosition.rotation));
        }
      }
      if (musicTrack) {
        formData.append("audioUrl", musicTrack.audioUrl);
        formData.append("audioTitle", musicTrack.title);
        formData.append("audioArtist", musicTrack.artist);
        if (musicTrack.durationMs != null) formData.append("audioDurationMs", String(musicTrack.durationMs));
      }
      const url = postId ? `/Story/AddStories?PostId=${postId}` : "/Story/AddStories";
      return request(url, {
        method: "POST",
        body: formData,
      });
    },

    async deleteStory(id: number): Promise<any> {
      return request(`/Story/DeleteStory?id=${id}`, {
        method: "DELETE",
      });
    },

    async addStoryView(storyId: number): Promise<any> {
      return request(`/Story/add-story-view?StoryId=${storyId}`, {
        method: "POST",
      });
    },

    async hideStoryFrom(userId: string): Promise<any> {
      return request(`/Story/hide-story-from?userId=${userId}`, {
        method: "POST",
      });
    },

    async unhideStoryFrom(userId: string): Promise<any> {
      return request(`/Story/unhide-story-from?userId=${userId}`, {
        method: "DELETE",
      });
    },

    async getHiddenUsers(): Promise<any[]> {
      const res = await request<any>("/Story/get-hidden-users");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getArchivedStories(): Promise<any[]> {
      const res = await request<any>("/Story/get-archived-stories");
      return Array.isArray(res) ? res : res?.data || [];
    },

    /** Author-only: swipe-up viewer list on your own active story. */
    async getStoryViewers(storyId: number): Promise<{ viewCount: number; viewers: any[] }> {
      return request(`/Story/get-story-viewers?storyId=${storyId}`);
    },

    /** Finds/creates the 1:1 chat (message-request rules apply). */
    async replyToStory(storyId: number, messageText: string): Promise<any> {
      return request("/Story/reply-to-story", {
        method: "POST",
        body: JSON.stringify({ storyId, messageText }),
      });
    },

    /** 403s if the author disabled story-resharing. */
    async sharePostToStory(postId: number): Promise<any> {
      return request("/Story/share-post-to-story", {
        method: "POST",
        body: JSON.stringify({ postId }),
      });
    },

    /** One-tap "Highlight" from the story viewer — pass an existing highlightId or a new title. */
    async addToHighlight(storyId: number, target: { highlightId?: string } | { title: string }): Promise<any> {
      return request("/Story/add-to-highlight", {
        method: "POST",
        body: JSON.stringify({ storyId, ...target }),
      });
    },
  },

  // --- CHAT ENDPOINTS ---
  chat: {
    async getChats(): Promise<any[]> {
      const res = await request<any>("/Chat/get-chats");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getChatById(chatId: number): Promise<any> {
      return request(`/Chat/get-chat-by-id?chatId=${chatId}`);
    },

    async createChat(receiverUserId: string): Promise<any> {
      // Returns a chat whose status is 'PENDING' (recipient doesn't follow you back)
      // or 'ACCEPTED'. Pending chats land in the recipient's message requests.
      return request(`/Chat/create-chat?receiverUserId=${receiverUserId}`, {
        method: "POST",
      });
    },

    /** Incoming pending message requests (for the recipient). */
    async getMessageRequests(): Promise<any[]> {
      const res = await request<any>("/Chat/get-message-requests");
      return Array.isArray(res) ? res : res?.data || [];
    },

    /** Accept a request: the chat moves to the normal inbox. */
    async acceptMessageRequest(chatId: number): Promise<any> {
      return request("/Chat/accept-message-request", {
        method: "PUT",
        body: JSON.stringify({ chatId }),
      });
    },

    /** Decline a request: the chat and its messages are deleted. */
    async declineMessageRequest(chatId: number): Promise<any> {
      return request(`/Chat/decline-message-request?chatId=${chatId}`, {
        method: "DELETE",
      });
    },

    async createGroupChat(name: string, participantIds: string[]): Promise<any> {
      return request("/Chat/create-group-chat", {
        method: "POST",
        body: JSON.stringify({ name, participantIds }),
      });
    },

    async sendMessage(
      chatId: number,
      messageText?: string,
      file?: File,
      voice?: { isVoice: true; durationMs: number },
      replyToMessageId?: number,
      isViewOnce?: boolean
    ): Promise<any> {
      const formData = new FormData();
      formData.append("ChatId", String(chatId));
      if (messageText) formData.append("MessageText", messageText);
      if (file) formData.append("File", file);
      if (voice) {
        formData.append("isVoice", "true");
        formData.append("durationMs", String(voice.durationMs));
      }
      if (replyToMessageId != null) {
        formData.append("replyToMessageId", String(replyToMessageId));
      }
      if (isViewOnce) formData.append("isViewOnce", "true");

      return request("/Chat/send-message", {
        method: "PUT",
        body: formData,
      });
    },

    /** Don't render `filePath` for a locked view-once bubble — this returns the media exactly once and wipes it server-side. */
    async openViewOnceMessage(messageId: number): Promise<{ mediaUrl: string }> {
      return request("/Chat/open-view-once-message", {
        method: "POST",
        body: JSON.stringify({ messageId }),
      });
    },

    async searchMessages(query: string, chatId?: number): Promise<any[]> {
      const q = new URLSearchParams({ query });
      if (chatId != null) q.append("chatId", String(chatId));
      const res = await request<any>(`/Chat/search-messages?${q.toString()}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    /** Per-user, max 3. */
    async pinChat(chatId: number, isPinned: boolean): Promise<any> {
      return request(`/Chat/pin-chat?chatId=${chatId}&isPinned=${isPinned}`, {
        method: "PUT",
      });
    },

    /** Call from the platform's screenshot-detection API when the other participant screenshots the thread. */
    async notifyScreenshot(chatId: number): Promise<any> {
      return request("/Chat/notify-screenshot", {
        method: "POST",
        body: JSON.stringify({ chatId }),
      });
    },

    async toggleVanishMode(chatId: number, isVanishMode: boolean): Promise<any> {
      return request(`/Chat/toggle-vanish-mode/${chatId}`, {
        method: "PUT",
        body: JSON.stringify({ isVanishMode }),
      });
    },

    async reactToMessage(messageId: number, reaction: string): Promise<any> {
      return request("/Chat/message-reaction", {
        method: "PUT",
        body: JSON.stringify({ messageId, reaction }),
      });
    },

    async deleteReaction(messageId: number): Promise<any> {
      return request(`/Chat/message-reaction?messageId=${messageId}`, {
        method: "DELETE",
      });
    },

    async deleteMessage(messageId: number, forEveryone = false): Promise<any> {
      // #4 Unsend: forEveryone=true removes it for both sides; false = delete for me.
      return request(`/Chat/delete-message?messageId=${messageId}&forEveryone=${forEveryone}`, {
        method: "DELETE",
      });
    },

    // --- READ RECEIPTS / TYPING (feature #4) ---
    async markMessagesSeen(chatId: number): Promise<any> {
      return request("/Chat/mark-messages-seen", {
        method: "PUT",
        body: JSON.stringify({ chatId }),
      });
    },
    async setTyping(chatId: number, isTyping: boolean): Promise<any> {
      return request("/Chat/set-typing", {
        method: "POST",
        body: JSON.stringify({ chatId, isTyping }),
      });
    },
    async getTypingStatus(chatId: number): Promise<any> {
      return request(`/Chat/get-typing-status?chatId=${chatId}`);
    },

    // --- GROUP MANAGEMENT (feature #5) ---
    async addGroupMember(chatId: number, userId: string): Promise<any> {
      return request("/Chat/add-group-member", {
        method: "POST",
        body: JSON.stringify({ chatId, userId }),
      });
    },
    async removeGroupMember(chatId: number, userId: string): Promise<any> {
      return request("/Chat/remove-group-member", {
        method: "POST",
        body: JSON.stringify({ chatId, userId }),
      });
    },
    async leaveGroup(chatId: number): Promise<any> {
      return request("/Chat/leave-group", {
        method: "POST",
        body: JSON.stringify({ chatId }),
      });
    },
    async promoteAdmin(chatId: number, userId: string): Promise<any> {
      return request("/Chat/promote-admin", {
        method: "POST",
        body: JSON.stringify({ chatId, userId }),
      });
    },

    async deleteChat(chatId: number): Promise<any> {
      return request(`/Chat/delete-chat?chatId=${chatId}`, {
        method: "DELETE",
      });
    },

    async initiateCall(data: { chatId: number; recipientId: string; type: "AUDIO" | "VIDEO" }): Promise<any> {
      return request("/Chat/initiate-call", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async respondToCall(data: { callId: string; status: "ACCEPTED" | "REJECTED" | "ENDED" }): Promise<any> {
      return request("/Chat/respond-to-call", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async getActiveCall(chatId: number): Promise<any> {
      return request(`/Chat/get-active-call?chatId=${chatId}`);
    },
  },

  // --- FOLLOWING RELATIONSHIP ENDPOINTS ---
  following: {
    async getSubscribers(userId: string): Promise<any[]> {
      const res = await request<any>(`/FollowingRelationShip/get-subscribers?UserId=${userId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getSubscriptions(userId: string): Promise<any[]> {
      const res = await request<any>(`/FollowingRelationShip/get-subscriptions?UserId=${userId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async follow(followingUserId: string): Promise<any> {
      return request(`/FollowingRelationShip/add-following-relation-ship?followingUserId=${followingUserId}`, {
        method: "POST",
      });
    },

    async unfollow(followingUserId: string): Promise<any> {
      return request(`/FollowingRelationShip/delete-following-relation-ship?followingUserId=${followingUserId}`, {
        method: "DELETE",
      });
    },

    async getPendingRequests(): Promise<any[]> {
      const res = await request<any>("/FollowingRelationShip/get-pending-requests");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async acceptFollowRequest(followerId: string): Promise<any> {
      return request(`/FollowingRelationShip/accept-follow-request?followerId=${followerId}`, {
        method: "PUT",
      });
    },

    async rejectFollowRequest(followerId: string): Promise<any> {
      return request(`/FollowingRelationShip/reject-follow-request?followerId=${followerId}`, {
        method: "PUT",
      });
    },

    /** "Remove" on a row in your own Followers list. */
    async removeFollower(followerId: string): Promise<any> {
      return request(`/FollowingRelationShip/remove-follower?followerId=${followerId}`, {
        method: "DELETE",
      });
    },

    /** `code` can be a profile URL, instaclone:// deep link, @username, or raw id. */
    async followViaQr(code: string): Promise<any> {
      return request("/FollowingRelationShip/follow-via-qr", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    },
  },

  // --- LOCATION ENDPOINTS ---
  location: {
    async getLocations(params: {
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}): Promise<any[]> {
      const query = new URLSearchParams();
      if (params.city) query.append("City", params.city);
      if (params.state) query.append("State", params.state);
      if (params.zipCode) query.append("ZipCode", params.zipCode);
      if (params.country) query.append("Country", params.country);
      if (params.pageNumber) query.append("PageNumber", String(params.pageNumber));
      if (params.pageSize) query.append("PageSize", String(params.pageSize));

      const res = await request<any>(`/Location/get-Locations?${query.toString()}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async getLocationById(id: number): Promise<any> {
      return request(`/Location/get-Location-by-id?id=${id}`);
    },

    async addLocation(data: { city: string; state: string; zipCode: string; country: string }): Promise<any> {
      return request("/Location/add-Location", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateLocation(data: { locationId: number; city: string; state: string; zipCode: string; country: string }): Promise<any> {
      return request("/Location/update-Location", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async deleteLocation(id: number): Promise<any> {
      return request(`/Location/delete-Location?id=${id}`, {
        method: "DELETE",
      });
    },

    async getLocationFeed(locationId: number): Promise<any[]> {
      const res = await request<any>(`/Location/get-location-feed?locationId=${locationId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },
  },

  // --- USER / SEARCH ENDPOINTS ---
  user: {
    async getUsers(params: {
      userName?: string;
      email?: string;
      pageNumber?: number;
      pageSize?: number;
    } = {}): Promise<any[]> {
      const query = new URLSearchParams();
      if (params.userName) query.append("UserName", params.userName);
      if (params.email) query.append("Email", params.email);
      if (params.pageNumber) query.append("PageNumber", String(params.pageNumber));
      if (params.pageSize) query.append("PageSize", String(params.pageSize));

      const res = await request<any>(`/User/get-users?${query.toString()}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async updateActivity(): Promise<any> {
      return request("/User/update-activity", {
        method: "PUT",
      });
    },

    /** People to follow, ranked by mutual followers; excludes already-followed/blocked/self. */
    async getSuggestedUsers(limit = 20): Promise<any[]> {
      const res = await request<any>(`/User/get-suggested-users?limit=${limit}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    /**
     * Records a recent search: a visited profile (`searchedUserId`) or a raw query (`queryText`).
     */
    async addSearchHistory(data: { searchedUserId?: string; queryText?: string }): Promise<any> {
      return request("/User/add-search-history", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async getSearchHistories(): Promise<any[]> {
      const res = await request<any>("/User/get-search-histories");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async deleteSearchHistory(id: number): Promise<any> {
      return request(`/User/delete-search-history?id=${id}`, {
        method: "DELETE",
      });
    },

    async deleteSearchHistories(): Promise<any> {
      return request("/User/delete-search-histories", {
        method: "DELETE",
      });
    },

    async addUserSearchHistory(userSearchId: string): Promise<any> {
      return request(`/User/add-user-search-history?UserSearchId=${userSearchId}`, {
        method: "POST",
      });
    },

    async getUserSearchHistories(): Promise<any[]> {
      const res = await request<any>("/User/get-user-search-histories");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async deleteUserSearchHistory(id: number): Promise<any> {
      return request(`/User/delete-user-search-history?id=${id}`, {
        method: "DELETE",
      });
    },

    async deleteUserSearchHistories(): Promise<any> {
      return request("/User/delete-user-search-histories", {
        method: "DELETE",
      });
    },

    async deleteUser(userId: string): Promise<any> {
      return request(`/User/delete-user?userId=${userId}`, {
        method: "DELETE",
      });
    },

    async blockUser(blockedUserId: string): Promise<any> {
      return request(`/User/block-user?blockedUserId=${blockedUserId}`, {
        method: "POST",
      });
    },

    async unblockUser(blockedUserId: string): Promise<any> {
      return request(`/User/unblock-user?blockedUserId=${blockedUserId}`, {
        method: "DELETE",
      });
    },

    async getBlockedUsers(): Promise<any[]> {
      const res = await request<any>("/User/get-blocked-users");
      return Array.isArray(res) ? res : res?.data || [];
    },

    // --- RESTRICT (item 7): hides the target's comments from everyone but the two of you ---
    async restrictUser(restrictedId: string): Promise<any> {
      return request(`/User/restrict-user?restrictedId=${restrictedId}`, {
        method: "POST",
      });
    },

    async unrestrictUser(restrictedId: string): Promise<any> {
      return request(`/User/unrestrict-user?restrictedId=${restrictedId}`, {
        method: "DELETE",
      });
    },

    async getRestrictedUsers(): Promise<any[]> {
      const res = await request<any>("/User/get-restricted-users");
      return Array.isArray(res) ? res : res?.data || [];
    },

    // --- MUTE (item 12): hide posts/stories without unfollowing ---
    async muteUser(mutedUserId: string, muteType: "ALL" | "POSTS" | "STORIES"): Promise<any> {
      return request(`/User/mute-user?mutedUserId=${mutedUserId}&muteType=${muteType}`, {
        method: "POST",
      });
    },

    async unmuteUser(mutedUserId: string): Promise<any> {
      return request(`/User/unmute-user?mutedUserId=${mutedUserId}`, {
        method: "DELETE",
      });
    },

    async getMutedUsers(): Promise<any[]> {
      const res = await request<any>("/User/get-muted-users");
      return Array.isArray(res) ? res : res?.data || [];
    },

    /**
     * Grant/revoke the verified badge (feature #19). This mock backend does not
     * admin-gate it, but treat it as an internal moderation tool — never expose in normal UI.
     */
    async setVerifiedBadge(userId: string, isVerified: boolean): Promise<any> {
      return request(`/User/set-verified-badge?userId=${userId}&isVerified=${isVerified}`, {
        method: "PUT",
      });
    },

    async addCloseFriends(friendUserIds: string[]): Promise<any> {
      return request("/User/add-close-friends", {
        method: "POST",
        body: JSON.stringify({ friendUserIds }),
      });
    },

    async deleteCloseFriend(userId: string): Promise<any> {
      return request(`/User/delete-close-friend/${userId}`, {
        method: "DELETE",
      });
    },

    async getCloseFriends(): Promise<any[]> {
      const res = await request<any>("/User/get-close-friends");
      return Array.isArray(res) ? res : res?.data || [];
    },

    /** startTime/endTime are "HH:mm" strings; the window wraps past midnight. */
    async updateQuietMode(data: { enabled: boolean; startTime?: string; endTime?: string }): Promise<any> {
      return request("/User/update-quiet-mode", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async addMutedWord(word: string): Promise<any> {
      return request("/User/add-muted-word", {
        method: "POST",
        body: JSON.stringify({ word }),
      });
    },
    async getMutedWords(): Promise<string[]> {
      const res = await request<any>("/User/get-muted-words");
      return Array.isArray(res) ? res : res?.data || [];
    },
    async removeMutedWord(word: string): Promise<any> {
      return request(`/User/remove-muted-word?word=${encodeURIComponent(word)}`, {
        method: "DELETE",
      });
    },

    async addCollectionCollaborator(collectionId: number, userId: string): Promise<any> {
      return request("/User/add-collection-collaborator", {
        method: "POST",
        body: JSON.stringify({ collectionId, userId }),
      });
    },
    async removeCollectionCollaborator(collectionId: number, userId: string): Promise<any> {
      return request("/User/remove-collection-collaborator", {
        method: "DELETE",
        body: JSON.stringify({ collectionId, userId }),
      });
    },
  },

  // --- SAVED COLLECTIONS ENDPOINTS (feature #2) ---
  collection: {
    async getCollections(): Promise<any[]> {
      const res = await request<any>("/User/get-collections");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async createCollection(name: string): Promise<any> {
      return request("/User/create-collection", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },

    async updateCollection(collectionId: number, name: string): Promise<any> {
      return request("/User/update-collection", {
        method: "PUT",
        body: JSON.stringify({ collectionId, name }),
      });
    },

    async deleteCollection(collectionId: number): Promise<any> {
      return request(`/User/delete-collection?collectionId=${collectionId}`, {
        method: "DELETE",
      });
    },
  },

  // --- MUSIC ENDPOINTS ---
  music: {
    /** Searches the catalogue. Called without a query it returns the popular/recommended tracks. */
    async search(query?: string): Promise<any[]> {
      const q = query?.trim();
      const res = await request<any>(`/Music/search${q ? `?query=${encodeURIComponent(q)}` : ""}`);
      return Array.isArray(res) ? res : res?.data || [];
    },
  },

  // --- NOTES ENDPOINTS ---
  note: {
    async addNote(data: {
      text: string;
      musicTrack?: { audioUrl: string; title: string; artist: string; durationMs: number };
    }): Promise<any> {
      return request("/User/add-note", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async getNotes(): Promise<any[]> {
      const res = await request<any>("/User/get-notes");
      return Array.isArray(res) ? res : res?.data || [];
    },

    async deleteNote(): Promise<any> {
      return request("/User/delete-note", {
        method: "DELETE",
      });
    },
  },

  // --- NOTIFICATION ENDPOINTS ---
  notification: {
    async getNotifications(pageNumber = 1, pageSize = 20): Promise<any[]> {
      const res = await request<any>(
        `/Notification/get-notifications?PageNumber=${pageNumber}&PageSize=${pageSize}`
      );
      return Array.isArray(res) ? res : res?.data || [];
    },

    async markAsRead(notificationId: string): Promise<any> {
      return request(`/Notification/mark-as-read?notificationId=${encodeURIComponent(notificationId)}`, {
        method: "PUT",
      });
    },

    async markAllAsRead(): Promise<any> {
      return request("/Notification/mark-as-read?all=true", {
        method: "PUT",
      });
    },

    async deleteNotification(id: string): Promise<any> {
      return request(`/Notification/delete-notification/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    /** Server actually suppresses notification creation per category, not just client-side filtering. */
    async getSettings(): Promise<Record<string, boolean>> {
      return request("/Notification/get-settings");
    },
    async updateSettings(category: "LIKES" | "COMMENTS" | "FOLLOWS" | "MENTIONS" | "MESSAGES", enabled: boolean): Promise<any> {
      return request(`/Notification/update-settings?category=${category}&enabled=${enabled}`, {
        method: "PUT",
      });
    },

    /** Storage/logging only — no real push delivery without a configured FCM/APNs backend. */
    async registerPushToken(token: string, platform: "IOS" | "ANDROID" | "WEB"): Promise<any> {
      return request("/Notification/register-push-token", {
        method: "POST",
        body: JSON.stringify({ token, platform }),
      });
    },
    async unregisterPushToken(token: string): Promise<any> {
      return request("/Notification/unregister-push-token", {
        method: "DELETE",
        body: JSON.stringify({ token }),
      });
    },
  },

  // --- HIGHLIGHT ENDPOINTS ---
  highlight: {
    async getUserHighlights(userId: string): Promise<any[]> {
      const res = await request<any>(`/Highlight/get-user-highlights/${userId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },

    async createHighlight(data: { title: string; cover?: string; storyIds: number[] }): Promise<any> {
      return request("/Highlight/create-highlight", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateHighlight(id: string, data: { title?: string; cover?: string; storyIds?: number[] }): Promise<any> {
      return request(`/Highlight/update-highlight/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async deleteHighlight(id: string): Promise<any> {
      return request(`/Highlight/delete-highlight/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },

    /** Drag-to-reorder on the highlight tray — must submit every one of the user's highlight ids. */
    async reorderHighlights(orderedIds: string[]): Promise<any> {
      return request("/Highlight/reorder-highlights", {
        method: "PUT",
        body: JSON.stringify({ orderedIds }),
      });
    },
  },

  // --- REPORT ENDPOINTS ---
  report: {
    async sendReport(data: {
      targetType: "POST" | "COMMENT" | "STORY" | "USER";
      targetId: string;
      reason: string;
    }): Promise<any> {
      return request("/Report/send-report", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async submitAppeal(data: { targetType: string; targetId: string; reason: string }): Promise<any> {
      return request("/Report/submit-appeal", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async getMyAppeals(): Promise<any[]> {
      const res = await request<any>("/Report/get-my-appeals");
      return Array.isArray(res) ? res : res?.data || [];
    },

    // --- INTERNAL MODERATION TOOLING — no role-gating server-side; gate access client-side ---
    async getReports(status?: string): Promise<any[]> {
      const res = await request<any>(`/Report/get-reports${status ? `?status=${status}` : ""}`);
      return Array.isArray(res) ? res : res?.data || [];
    },
    async resolveReport(reportId: string, status: string, resolutionNote?: string): Promise<any> {
      return request("/Report/resolve-report", {
        method: "PUT",
        body: JSON.stringify({ reportId, status, resolutionNote }),
      });
    },
    async getAppeals(status?: string): Promise<any[]> {
      const res = await request<any>(`/Report/get-appeals${status ? `?status=${status}` : ""}`);
      return Array.isArray(res) ? res : res?.data || [];
    },
    async resolveAppeal(appealId: string, status: string, resolutionNote?: string): Promise<any> {
      return request("/Report/resolve-appeal", {
        method: "PUT",
        body: JSON.stringify({ appealId, status, resolutionNote }),
      });
    },
  },

  // --- SEARCH ---
  search: {
    async unifiedSearch(query: string, filter: "TOP" | "ACCOUNTS" | "TAGS" | "PLACES" = "TOP"): Promise<any> {
      return request(`/Search/unified-search?query=${encodeURIComponent(query)}&filter=${filter}`);
    },
  },

  // --- LIVE VIDEO ENDPOINTS (simulated — text/viewer-count only, no real RTC) ---
  live: {
    async startLive(title?: string): Promise<any> {
      return request("/Live/start-live", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
    },
    async endLive(sessionId: string): Promise<any> {
      return request("/Live/end-live", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
    },
    async getActiveLives(): Promise<any[]> {
      const res = await request<any>("/Live/get-active-lives");
      return Array.isArray(res) ? res : res?.data || [];
    },
    async joinLive(sessionId: string): Promise<any> {
      return request("/Live/join-live", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
    },
    async leaveLive(sessionId: string): Promise<any> {
      return request("/Live/leave-live", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
    },
    async sendLiveComment(sessionId: string, text: string): Promise<any> {
      return request("/Live/send-live-comment", {
        method: "POST",
        body: JSON.stringify({ sessionId, text }),
      });
    },
    async getLiveComments(sessionId: string): Promise<any[]> {
      const res = await request<any>(`/Live/get-live-comments?sessionId=${sessionId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },
  },

  // --- BROADCAST CHANNELS (one-way announcement threads) ---
  broadcast: {
    async createChannel(name: string, description?: string): Promise<any> {
      return request("/Broadcast/create-channel", {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
    },
    async getChannels(): Promise<any[]> {
      const res = await request<any>("/Broadcast/get-channels");
      return Array.isArray(res) ? res : res?.data || [];
    },
    async subscribe(channelId: string): Promise<any> {
      return request("/Broadcast/subscribe", {
        method: "POST",
        body: JSON.stringify({ channelId }),
      });
    },
    async unsubscribe(channelId: string): Promise<any> {
      return request(`/Broadcast/unsubscribe?channelId=${channelId}`, {
        method: "DELETE",
      });
    },
    /** Owner only. */
    async sendMessage(channelId: string, text: string): Promise<any> {
      return request("/Broadcast/send-message", {
        method: "POST",
        body: JSON.stringify({ channelId, text }),
      });
    },
    async getMessages(channelId: string): Promise<any[]> {
      const res = await request<any>(`/Broadcast/get-messages?channelId=${channelId}`);
      return Array.isArray(res) ? res : res?.data || [];
    },
  },
};
