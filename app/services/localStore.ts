/**
 * Local persistence layer (localStorage) for features the backend can't serve:
 *  - Saved / bookmarked posts: `get-post-favorites` returns null server-side.
 *  - Comments: the API never returns a comments array (only `commentCount`).
 * We still call the backend endpoints (best-effort); this keeps the UX working
 * and persistent across reloads.
 */

export interface LocalComment {
  id: number;
  username: string;
  text: string;
}

export interface SavedPost {
  id: number;
  userId: string;
  username: string;
  avatar: string;
  image: string;
  caption: string;
  likes: number;
  time: string;
}

const savedKey = (uid: string) => `saved_posts_${uid}`;
const commentsKey = (postId: number) => `post_comments_${postId}`;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / serialization errors */
  }
}

/* ---------- Saved posts ---------- */

export function getSavedPosts(uid: string): SavedPost[] {
  return read<SavedPost[]>(savedKey(uid), []);
}

export function isPostSaved(uid: string, postId: number): boolean {
  return getSavedPosts(uid).some((p) => p.id === postId);
}

/** Toggles saved state; returns true if the post is now saved. */
export function toggleSavedPost(uid: string, post: SavedPost): boolean {
  const list = getSavedPosts(uid);
  const exists = list.some((p) => p.id === post.id);
  const next = exists ? list.filter((p) => p.id !== post.id) : [post, ...list];
  write(savedKey(uid), next);
  return !exists;
}

export function removeSavedPost(uid: string, postId: number): void {
  write(
    savedKey(uid),
    getSavedPosts(uid).filter((p) => p.id !== postId)
  );
}

/* ---------- Comments ---------- */

export function getLocalComments(postId: number): LocalComment[] {
  return read<LocalComment[]>(commentsKey(postId), []);
}

export function addLocalComment(postId: number, comment: LocalComment): void {
  write(commentsKey(postId), [...getLocalComments(postId), comment]);
}

export function removeLocalComment(postId: number, commentId: number): void {
  write(
    commentsKey(postId),
    getLocalComments(postId).filter((c) => c.id !== commentId)
  );
}
