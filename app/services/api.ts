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

export function getFullImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
}

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

    async login(data: any): Promise<string> {
      // Returns the Bearer token directly or in wrapper
      const res = await request<any>("/Account/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      // Handle response token payload (could be in res.data or direct string)
      const token = typeof res === "string" ? res : res?.token || res?.data || res;
      if (token && typeof token === "string") {
        setStoredToken(token);
      }
      return token;
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

    async logoutSession(sessionId: string): Promise<any> {
      return request("/Account/logout-session", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
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

    async updateUserProfile(data: { about?: string; gender?: number }): Promise<any> {
      return request("/UserProfile/update-user-profile", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async getPostFavorites(pageNumber = 1, pageSize = 20): Promise<any> {
      return request(`/UserProfile/get-post-favorites?PageNumber=${pageNumber}&PageSize=${pageSize}`);
    },

    async updatePrivacy(isPrivate: boolean): Promise<any> {
      return request(`/UserProfile/update-privacy?isPrivate=${isPrivate}`, {
        method: "PUT",
      });
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

    async getMyPosts(): Promise<any[]> {
      const res = await request<any>("/Post/get-my-posts");
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

    async addPost(data: { title: string; content: string; images: File[]; isReel?: boolean }): Promise<any> {
      const formData = new FormData();
      formData.append("Title", data.title);
      formData.append("Content", data.content);
      if (data.isReel) {
        formData.append("isReel", "true");
      }
      data.images.forEach((img) => {
        formData.append("Images", img);
      });

      return request("/Post/add-post", {
        method: "POST",
        body: formData,
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

    async addComment(data: { postId: number; comment: string }): Promise<any> {
      return request("/Post/add-comment", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async deleteComment(commentId: number): Promise<any> {
      return request(`/Post/delete-comment?commentId=${commentId}`, {
        method: "DELETE",
      });
    },

    async addPostFavorite(data: { postId: number }): Promise<any> {
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
    }): Promise<any> {
      const formData = new FormData();
      formData.append("File", data.file);
      if (data.caption) formData.append("caption", data.caption);
      if (data.audioId) formData.append("audioId", data.audioId);
      if (data.audioName) formData.append("audioName", data.audioName);
      if (data.audioArtist) formData.append("audioArtist", data.audioArtist);

      return request("/Post/add-reel", {
        method: "POST",
        body: formData,
      });
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

    async addStory(
      file: File,
      postId?: number,
      isForCloseFriends = false,
      sticker?: { type: "POLL" | "QUESTION"; question: string; options?: string[] },
      musicTrack?: { id: string; title: string; artist: string; audioUrl: string; coverUrl?: string; durationMs?: number } | null
    ): Promise<any> {
      const formData = new FormData();
      formData.append("Image", file);
      formData.append("isForCloseFriends", String(isForCloseFriends));
      if (sticker) {
        formData.append("stickerType", sticker.type);
        formData.append("stickerQuestion", sticker.question);
        // A poll's options are a repeated field so the backend binds them as a string[].
        (sticker.options || []).forEach((opt) => formData.append("stickerOptions", opt));
      }
      if (musicTrack) {
        formData.append("audioUrl", musicTrack.audioUrl);
        formData.append("audioTitle", musicTrack.title);
        formData.append("audioArtist", musicTrack.artist);
        if (musicTrack.coverUrl) {
          formData.append("coverUrl", musicTrack.coverUrl);
        }
        formData.append("musicTrack", JSON.stringify(musicTrack));
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
      return request(`/Chat/create-chat?receiverUserId=${receiverUserId}`, {
        method: "POST",
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
      replyToMessageId?: number
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

      return request("/Chat/send-message", {
        method: "PUT",
        body: formData,
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

    async deleteMessage(messageId: number): Promise<any> {
      return request(`/Chat/delete-message?massageId=${messageId}`, {
        method: "DELETE",
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
  },
};
