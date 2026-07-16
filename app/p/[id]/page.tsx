"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSelector } from "react-redux";
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, Copy, Check } from "lucide-react";
import { RootState } from "../../store/store";
import { api } from "../../services/api";
import { formatBackendPost, formatComment, Post, Comment } from "../../store/slices/postsSlice";
import Avatar from "../../components/Avatar";
import SmartImage from "../../components/SmartImage";
import HashtagText from "../../components/HashtagText";
import VerifiedBadge from "../../components/VerifiedBadge";
import LikersListModal from "../../components/LikersListModal";
import { PostSkeleton } from "../../components/SkeletonLoader";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = Number(params?.id);
  const { currentUser } = useSelector((state: RootState) => state.auth);

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: number; username: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [likersOpen, setLikersOpen] = useState(false);
  const [activeProductTag, setActiveProductTag] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setForbidden(false);
    api.post
      .getPostById(postId)
      .then((raw) => {
        if (cancelled) return;
        setPost(formatBackendPost(raw));
        api.post.viewPost(postId).catch(() => {});
      })
      .catch((err: any) => {
        if (cancelled) return;
        if (err?.status === 403) setForbidden(true);
        else setNotFound(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const refreshComments = async () => {
    try {
      const raw = await api.post.getComments(postId);
      setPost((p) => (p ? { ...p, comments: (raw || []).map(formatComment) } : p));
    } catch {
      // keep the stale list rather than clearing it
    }
  };

  const handleLike = async () => {
    if (!post) return;
    const wasLiked = post.isLiked;
    setPost({ ...post, isLiked: !wasLiked, likes: post.likes + (wasLiked ? -1 : 1) });
    try {
      await api.post.likePost(post.id);
    } catch {
      setPost((p) => (p ? { ...p, isLiked: wasLiked, likes: p.likes + (wasLiked ? 1 : -1) } : p));
    }
  };

  const handleSave = async () => {
    if (!post) return;
    const wasSaved = post.isSaved;
    setPost({ ...post, isSaved: !wasSaved });
    try {
      await api.post.addPostFavorite({ postId: post.id });
    } catch {
      setPost((p) => (p ? { ...p, isSaved: wasSaved } : p));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !newComment.trim()) return;
    try {
      await api.post.addComment({
        postId: post.id,
        comment: newComment.trim(),
        parentCommentId: replyingTo?.commentId,
      });
      setNewComment("");
      if (replyingTo) setExpandedReplies((prev) => new Set(prev).add(replyingTo.commentId));
      setReplyingTo(null);
      await refreshComments();
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    setPost((p) => {
      if (!p) return p;
      const bump = (c: Comment): Comment =>
        c.id === comment.id
          ? { ...c, isLiked: !c.isLiked, likeCount: c.likeCount + (c.isLiked ? -1 : 1) }
          : { ...c, replies: c.replies.map(bump) };
      return { ...p, comments: p.comments.map(bump) };
    });
    try {
      await api.post.likeComment(comment.id);
    } catch {
      await refreshComments();
    }
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const getUserLink = (userId: string) => (currentUser?.id === userId ? "/profile" : `/u/${userId}`);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${postId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={isReply ? "" : "flex flex-col gap-2"}>
      <div className="flex items-start gap-3 text-sm">
        <Link href={getUserLink(comment.userId)}>
          <Avatar src={comment.avatar} name={comment.username} className={isReply ? "w-6 h-6 flex-shrink-0" : "w-8 h-8 flex-shrink-0"} />
        </Link>
        <div className="flex-1 min-w-0">
          {comment.isPinned && !isReply && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 mb-0.5">
              📌 Закреплено автором
            </span>
          )}
          <p className="leading-snug break-words">
            <Link href={getUserLink(comment.userId)} className="font-bold mr-2 hover:underline">
              {comment.username}
            </Link>
            {comment.text}
          </p>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-400">
            {comment.likeCount > 0 && <span className="font-semibold">{comment.likeCount} отметок «Нравится»</span>}
            {currentUser && (
              <button
                onClick={() => setReplyingTo({ commentId: isReply ? comment.id : comment.id, username: comment.username })}
                className="font-semibold hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                Ответить
              </button>
            )}
          </div>

          {!isReply && comment.replyCount > 0 && (
            <div className="mt-2">
              <button
                onClick={() => toggleReplies(comment.id)}
                className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
              >
                <span className="w-6 h-px bg-zinc-300 dark:bg-zinc-700" />
                {expandedReplies.has(comment.id) ? "Скрыть ответы" : `Смотреть ответы (${comment.replyCount})`}
              </button>
              {expandedReplies.has(comment.id) && (
                <div className="flex flex-col gap-2.5 mt-2.5 pl-2">
                  {comment.replies.map((reply) => renderComment(reply, true))}
                </div>
              )}
            </div>
          )}
        </div>
        {currentUser && (
          <button
            onClick={() => handleLikeComment(comment)}
            className="p-1 flex-shrink-0 hover:scale-110 active:scale-90 transition cursor-pointer"
          >
            <Heart className={`w-3.5 h-3.5 ${comment.isLiked ? "fill-like text-like" : "text-zinc-400"}`} />
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8">
        <PostSkeleton />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-black dark:text-white">
        <h3 className="text-xl font-bold">Публикация не найдена</h3>
        <button onClick={() => router.push("/")} className="btn-primary px-5 py-2 text-sm mt-2 cursor-pointer">
          На главную
        </button>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-black dark:text-white">
        <h3 className="text-xl font-bold">Эта публикация недоступна</h3>
        <p className="text-sm text-zinc-500 max-w-xs">У вас нет доступа для просмотра этой публикации.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-0 md:px-4 py-0 md:py-8 text-black dark:text-white">
      <button
        onClick={() => router.back()}
        className="hidden md:flex items-center gap-1.5 text-sm font-semibold mb-4 hover:opacity-70 cursor-pointer"
      >
        <ChevronLeft className="w-5 h-5" /> Назад
      </button>

      <div className="md:glass-strong md:rounded-2xl md:shadow-soft-lg flex flex-col md:flex-row overflow-hidden md:max-h-[85vh]">
        {/* Media */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] md:min-h-0">
          <SmartImage src={post.image} alt={post.caption} width={900} height={900} className="w-full max-h-[50vh] md:max-h-[85vh] object-contain" />
          {(post.productTags || []).map((tag, i) => (
            <button
              key={tag.id || i}
              onClick={() => setActiveProductTag(activeProductTag === i ? null : i)}
              className="absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full bg-white/90 border border-black/20 shadow animate-pulse cursor-pointer"
              style={{ left: `${tag.x * 100}%`, top: `${tag.y * 100}%` }}
            />
          ))}
          {activeProductTag != null && post.productTags?.[activeProductTag] && (
            <div
              className="absolute z-10 glass-strong rounded-xl shadow-soft-lg p-3 flex flex-col gap-1 min-w-[160px]"
              style={{
                left: `${Math.min(post.productTags[activeProductTag].x * 100, 65)}%`,
                top: `${Math.min(post.productTags[activeProductTag].y * 100, 70)}%`,
              }}
            >
              <span className="text-sm font-semibold">{post.productTags[activeProductTag].name}</span>
              <span className="text-xs text-zinc-400">
                {post.productTags[activeProductTag].price} {post.productTags[activeProductTag].currency}
              </span>
              {post.productTags[activeProductTag].url && (
                <a
                  href={post.productTags[activeProductTag].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#0095f6] dark:text-[#4da6ff] hover:underline mt-1"
                >
                  Посмотреть товар
                </a>
              )}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="w-full md:w-[380px] border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800">
            <Link href={getUserLink(post.userId)}>
              <Avatar src={post.avatar} name={post.username} className="w-9 h-9" />
            </Link>
            <div className="flex flex-col min-w-0">
              <Link href={getUserLink(post.userId)} className="font-semibold text-sm hover:underline flex items-center gap-1">
                {post.username}
                {post.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
              </Link>
              {post.location && (
                post.locationId ? (
                  <Link href={`/explore/locations/${post.locationId}`} className="text-xs text-zinc-500 truncate hover:underline w-fit">
                    {post.location}
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-500 truncate">{post.location}</span>
                )
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {post.caption && (
              <p className="text-sm whitespace-pre-wrap break-words">
                <Link href={getUserLink(post.userId)} className="font-bold mr-2 hover:underline">
                  {post.username}
                </Link>
                <HashtagText text={post.caption} />
              </p>
            )}
            {post.comments.length === 0 ? (
              <p className="text-sm text-zinc-450 text-center py-6">Комментариев пока нет.</p>
            ) : (
              <div className="flex flex-col gap-4">{post.comments.map((c) => renderComment(c))}</div>
            )}
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={handleLike} className="hover:scale-110 active:scale-90 transition cursor-pointer">
                  <Heart className={`w-6 h-6 ${post.isLiked ? "fill-like text-like" : ""}`} />
                </button>
                <MessageCircle className="w-6 h-6" />
                <button onClick={handleCopyLink} className="hover:scale-110 active:scale-90 transition cursor-pointer">
                  {copied ? <Check className="w-6 h-6" /> : <Send className="w-6 h-6" />}
                </button>
              </div>
              <button onClick={handleSave} className="hover:scale-110 active:scale-90 transition cursor-pointer">
                <Bookmark className={`w-6 h-6 ${post.isSaved ? "fill-current" : ""}`} />
              </button>
            </div>
            <button onClick={() => setLikersOpen(true)} className="text-sm font-bold text-left w-fit cursor-pointer hover:opacity-70">
              {post.hideLikeCount ? (post.isLiked ? "Нравится вам и другим" : "Нравится другим людям") : `${post.likes.toLocaleString()} отметок «Нравится»`}
            </button>

            {post.allowComments && currentUser && (
              <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                {replyingTo && (
                  <span className="text-xs text-zinc-400 flex-shrink-0">
                    → {replyingTo.username}{" "}
                    <button type="button" onClick={() => setReplyingTo(null)} className="underline cursor-pointer">
                      ✕
                    </button>
                  </span>
                )}
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Добавьте комментарий..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder-zinc-400"
                />
                {newComment.trim() && (
                  <button type="submit" className="text-blue-500 font-semibold text-sm cursor-pointer">
                    Отправить
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {likersOpen && <LikersListModal postId={post.id} onClose={() => setLikersOpen(false)} />}
    </div>
  );
}
