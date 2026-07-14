"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { ChevronLeft, ChevronRight, X, Heart, Flag, Star, Send, BarChart3, Search } from "lucide-react";
import { AppDispatch } from "../store/store";
import { likeStory, answerSticker, Story } from "../store/slices/storiesSlice";
import { api, getFullImageUrl } from "../services/api";
import Avatar from "./Avatar";

/** Quick reactions offered above the reply box. */
const QUICK_REACTIONS = ["😂", "😮", "😍", "😢", "👏", "🔥"];

const STORY_DURATION_MS = 5000;

interface FlyingEmoji {
  key: number;
  emoji: string;
  left: number;
  delay: number;
}

interface PollOptionResult {
  text: string;
  count: number;
  percent: number;
}

interface QuestionAnswer {
  userId: string;
  userName: string;
  avatar: string;
  text: string;
}

interface StickerResults {
  totalVotes: number;
  options: PollOptionResult[];
  answers: QuestionAnswer[];
}

/** Backend result payloads vary in shape; fold them into one predictable form. */
function normalizeResults(raw: any, sticker: NonNullable<Story["sticker"]>): StickerResults {
  const rawOptions: any[] = raw?.options ?? raw?.results ?? raw?.votes ?? [];
  const counts: number[] = sticker.options.map((_, i) => {
    const match = rawOptions[i];
    if (typeof match === "number") return match;
    return Number(match?.count ?? match?.votes ?? match?.voteCount ?? 0) || 0;
  });
  const total = Number(raw?.totalVotes ?? raw?.total ?? counts.reduce((a, b) => a + b, 0)) || 0;

  const options: PollOptionResult[] = sticker.options.map((text, i) => ({
    text,
    count: counts[i],
    // Guard against a zero total so an unvoted poll shows 0%, not NaN%.
    percent: total > 0 ? Math.round((counts[i] / total) * 100) : 0,
  }));

  const rawAnswers: any[] = raw?.answers ?? raw?.textAnswers ?? raw?.responses ?? [];
  const answers: QuestionAnswer[] = rawAnswers.map((a: any) => ({
    userId: a?.userId || a?.id || "",
    userName: a?.userName || a?.username || "user",
    avatar: getFullImageUrl(a?.avatar || a?.userAvatar || a?.imagePath),
    text: a?.textAnswer || a?.text || a?.answer || "",
  }));

  return { totalVotes: total, options, answers };
}

interface StoryViewerProps {
  story: Story;
  list: Story[];
  currentUserId?: string;
  /** Parent marks the story viewed and swaps the active one. */
  onNavigate: (story: Story) => void;
  onClose: () => void;
  onReport: (storyId: number) => void;
}

export default function StoryViewer({
  story,
  list,
  currentUserId,
  onNavigate,
  onClose,
  onReport,
}: StoryViewerProps) {
  const dispatch = useDispatch<AppDispatch>();

  const [replyText, setReplyText] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const [flying, setFlying] = useState<FlyingEmoji[]>([]);

  // Sticker interaction
  const [answerText, setAnswerText] = useState("");
  const [stickerBusy, setStickerBusy] = useState(false);
  const [results, setResults] = useState<StickerResults | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [showResultsPanel, setShowResultsPanel] = useState(false);

  const flyingKey = useRef(0);

  // The parent re-creates these callbacks on every render. Holding them in refs keeps the
  // auto-advance timer below from restarting (and the story from stalling) whenever the store ticks.
  const navigateRef = useRef(onNavigate);
  const closeRef = useRef(onClose);
  useEffect(() => {
    navigateRef.current = onNavigate;
    closeRef.current = onClose;
  });

  const index = list.findIndex((s) => s.id === story.id);
  const isMine = !!currentUserId && story.userId === currentUserId;
  const sticker = story.sticker;
  const hasVoted = sticker?.type === "POLL" && sticker.myOptionIndex !== null;
  const hasAnswered = sticker?.type === "QUESTION" && !!sticker.myAnswer;

  // Anything that demands the viewer's attention freezes the 5s auto-advance,
  // otherwise the story would slide away mid-vote or mid-sentence.
  const paused = showReactions || showResultsPanel || !!replyText || !!answerText || stickerBusy;

  // ---- Auto-advance ----
  // Depend on the *id* of the next story, not the object: the store hands back fresh objects on
  // every mutation, and depending on identity would reset the timer mid-story.
  const nextStoryId = index >= 0 && index < list.length - 1 ? list[index + 1].id : null;
  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  });

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => {
      const next = nextStoryId === null ? null : listRef.current.find((s) => s.id === nextStoryId);
      if (next) navigateRef.current(next);
      else closeRef.current();
    }, STORY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [story.id, nextStoryId, paused]);

  // Per-story UI state (reply draft, sticker answer, results) resets because the parent keys this
  // component by story id, remounting it on every navigation.

  // ---- Flying emoji burst ----
  const burst = useCallback((emoji: string) => {
    const batch: FlyingEmoji[] = Array.from({ length: 7 }).map((_, i) => ({
      key: flyingKey.current++,
      emoji,
      left: 20 + Math.random() * 60,
      delay: i * 0.09,
    }));
    setFlying((prev) => [...prev, ...batch]);
    const keys = new Set(batch.map((b) => b.key));
    setTimeout(() => setFlying((prev) => prev.filter((f) => !keys.has(f.key))), 1800);
  }, []);

  const handleLike = () => {
    dispatch(likeStory({ storyId: story.id, wasLiked: story.isLiked }));
    if (!story.isLiked) burst("❤️");
  };

  const handleReaction = (emoji: string) => {
    // A reaction is a like carrying an emoji, so an already-liked story stays liked.
    dispatch(likeStory({ storyId: story.id, reaction: emoji, wasLiked: false }));
    burst(emoji);
    setShowReactions(false);
  };

  // ---- Sticker results (author-only on the backend) ----
  const loadResults = useCallback(async () => {
    if (!sticker) return;
    try {
      const raw = await api.story.getStickerResults(sticker.id);
      setResults(normalizeResults(raw, sticker));
      setResultsError(null);
    } catch (err: any) {
      // Viewers may be forbidden from reading tallies — that's expected, not a crash.
      setResultsError(err?.message || "Не удалось загрузить результаты.");
      setResults(null);
    }
  }, [sticker]);

  // The author sees live tallies; a voter sees them once their vote lands.
  useEffect(() => {
    if (!sticker) return;
    if (isMine || hasVoted) loadResults();
  }, [sticker, isMine, hasVoted, loadResults]);

  const handleVote = async (optionIndex: number) => {
    if (!sticker || hasVoted || stickerBusy) return;
    setStickerBusy(true);
    try {
      await dispatch(
        answerSticker({ storyId: story.id, stickerId: sticker.id, selectedOptionIndex: optionIndex })
      ).unwrap();
      await loadResults();
    } catch (err) {
      console.error("Failed to vote:", err);
    } finally {
      setStickerBusy(false);
    }
  };

  const handleAnswerQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = answerText.trim();
    if (!sticker || !text || stickerBusy) return;
    setStickerBusy(true);
    try {
      await dispatch(
        answerSticker({ storyId: story.id, stickerId: sticker.id, textAnswer: text })
      ).unwrap();
      setAnswerText("");
      burst("💬");
    } catch (err) {
      console.error("Failed to answer question:", err);
    } finally {
      setStickerBusy(false);
    }
  };

  const openResultsPanel = () => {
    setShowResultsPanel(true);
    loadResults();
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-55 flex items-center justify-center p-4 select-none">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2 z-60 cursor-pointer"
      >
        <X className="w-8 h-8" />
      </button>

      {/* Previous */}
      <button
        onClick={() => index > 0 && onNavigate(list[index - 1])}
        disabled={index <= 0}
        className="absolute left-4 p-2 text-white hover:text-zinc-300 disabled:opacity-20 cursor-pointer"
      >
        <ChevronLeft className="w-10 h-10" />
      </button>

      {/* ---- Story card ---- */}
      <div className="relative w-full max-w-md h-[80vh] rounded-xl overflow-hidden shadow-2xl flex flex-col bg-zinc-950">
        {/* Progress bar */}
        <div className="absolute top-2 left-3 right-3 z-20 h-0.5 bg-white/30 rounded overflow-hidden">
          <div
            key={story.id}
            className="h-full bg-white origin-left animate-reel-progress"
            style={{
              animationDuration: `${STORY_DURATION_MS}ms`,
              animationPlayState: paused ? "paused" : "running",
            }}
          />
        </div>

        {/* Header */}
        <Link
          href={story.userId ? `/u/${story.userId}` : "#"}
          className="absolute top-0 left-0 right-0 p-4 pt-5 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center gap-3"
        >
          <Avatar src={story.avatar} name={story.username} className="w-9 h-9 border border-white" />
          <span className="text-white font-semibold text-sm drop-shadow">{story.username}</span>
          {story.isForCloseFriends && (
            <span className="flex items-center gap-1 bg-green-500 rounded-full px-2 py-0.5 text-white text-[10px] font-bold">
              <Star className="w-2.5 h-2.5 fill-white" /> Близкие друзья
            </span>
          )}
        </Link>

        {/* Media */}
        <img src={story.image} alt="Story" className="w-full h-full object-contain" />

        {/* Flying emoji burst */}
        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
          {flying.map((f) => (
            <span
              key={f.key}
              className="story-emoji-fly"
              style={{ left: `${f.left}%`, animationDelay: `${f.delay}s` }}
            >
              {f.emoji}
            </span>
          ))}
        </div>

        {/* ---- Interactive sticker ---- */}
        {sticker && (
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 flex justify-center px-6">
            <div className="glass-strong w-full max-w-xs rounded-3xl p-4 shadow-soft-lg flex flex-col gap-3">
              <p className="text-sm font-bold text-center break-words">{sticker.question}</p>

              {sticker.type === "POLL" ? (
                <div className="flex flex-col gap-2">
                  {sticker.options.map((option, i) => {
                    const result = results?.options[i];
                    const chosen = sticker.myOptionIndex === i;
                    // Percentages need tallies; without them we still confirm the chosen option.
                    const showPercent = (hasVoted || isMine) && !!result;

                    return (
                      <button
                        key={i}
                        onClick={() => handleVote(i)}
                        disabled={hasVoted || isMine || stickerBusy}
                        className={`relative overflow-hidden rounded-2xl px-4 py-2.5 text-sm font-semibold text-left transition cursor-pointer disabled:cursor-default ${
                          chosen ? "btn-grad text-white" : "glass hover:shadow-soft"
                        }`}
                      >
                        {showPercent && (
                          <span
                            className="absolute inset-y-0 left-0 bg-[var(--accent-2)]/25"
                            style={{ width: `${result!.percent}%` }}
                          />
                        )}
                        <span className="relative flex items-center justify-between gap-2">
                          <span className="truncate">{option}</span>
                          {showPercent && <span className="tabular-nums">{result!.percent}%</span>}
                        </span>
                      </button>
                    );
                  })}

                  {hasVoted && !results && (
                    <span className="text-[11px] text-center text-zinc-500">Ваш голос учтён</span>
                  )}
                  {results && results.totalVotes > 0 && (
                    <span className="text-[11px] text-center text-zinc-500">
                      Всего голосов: {results.totalVotes}
                    </span>
                  )}
                </div>
              ) : isMine ? (
                <p className="text-[11px] text-center text-zinc-500">
                  Ответы зрителей видно в результатах.
                </p>
              ) : hasAnswered ? (
                <p className="text-[11px] text-center text-zinc-500">Ответ отправлен ✓</p>
              ) : (
                <form onSubmit={handleAnswerQuestion} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Ваш ответ..."
                    className="flex-1 min-w-0 glass rounded-full px-3.5 py-2 text-sm outline-none text-zinc-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!answerText.trim() || stickerBusy}
                    className="w-9 h-9 rounded-full btn-grad flex items-center justify-center flex-shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ---- Bottom bar ---- */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-30 flex flex-col gap-3">
          {/* Quick reactions strip */}
          {showReactions && (
            <div className="glass-strong rounded-full px-3 py-2 flex items-center justify-around animate-pop-in">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleReaction(emoji)}
                  className="text-2xl hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setShowReactions(true)}
              onBlur={() => setTimeout(() => setShowReactions(false), 150)}
              placeholder={`Ответить ${story.username}...`}
              className="flex-1 min-w-0 bg-transparent border border-white/40 focus:border-white rounded-full px-4 py-2.5 text-white text-sm outline-none placeholder-white/70"
            />

            <button
              onClick={handleLike}
              title={story.isLiked ? "Убрать лайк" : "Нравится"}
              className="text-white hover:scale-110 active:scale-90 transition cursor-pointer flex-shrink-0"
            >
              <Heart className={`w-7 h-7 ${story.isLiked ? "fill-red-500 text-red-500" : ""}`} />
            </button>

            {isMine && sticker && (
              <button
                onClick={openResultsPanel}
                title="Результаты стикера"
                className="text-white hover:scale-110 active:scale-90 transition cursor-pointer flex-shrink-0"
              >
                <BarChart3 className="w-6 h-6" />
              </button>
            )}

            {currentUserId && !isMine && (
              <button
                onClick={() => onReport(story.id)}
                title="Пожаловаться на историю"
                className="text-white hover:text-red-400 hover:scale-110 active:scale-90 transition cursor-pointer flex-shrink-0"
              >
                <Flag className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* ---- Author's results panel ---- */}
        {showResultsPanel && sticker && (
          <div
            className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end"
            onClick={() => setShowResultsPanel(false)}
          >
            <div
              className="w-full glass-strong rounded-t-3xl p-5 flex flex-col gap-4 max-h-[70%] animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <BarChart3 className="w-4.5 h-4.5" />
                  {sticker.type === "POLL" ? "Результаты опроса" : "Ответы"}
                </h3>
                <button
                  onClick={() => setShowResultsPanel(false)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-zinc-500 -mt-2">{sticker.question}</p>

              {resultsError ? (
                <p className="text-sm text-red-500">{resultsError}</p>
              ) : !results ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-xl shimmer" />
                  ))}
                </div>
              ) : sticker.type === "POLL" ? (
                <div className="flex flex-col gap-3 overflow-y-auto">
                  {results.options.map((option, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold truncate">{option.text}</span>
                        <span className="tabular-nums text-zinc-500 flex-shrink-0 ml-2">
                          {option.percent}% · {option.count}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div className="h-full btn-grad rounded-full" style={{ width: `${option.percent}%` }} />
                      </div>
                    </div>
                  ))}
                  <span className="text-xs text-zinc-500">Всего голосов: {results.totalVotes}</span>
                </div>
              ) : results.answers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-zinc-400">
                  <Search className="w-8 h-8" />
                  <span className="text-sm">Ответов пока нет.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 overflow-y-auto">
                  {results.answers.map((answer, i) => (
                    <div key={`${answer.userId}-${i}`} className="flex items-center gap-3 glass rounded-2xl p-3">
                      <Avatar src={answer.avatar} name={answer.userName} className="w-9 h-9 flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{answer.userName}</span>
                        <span className="text-sm break-words">{answer.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Next */}
      <button
        onClick={() => index < list.length - 1 && onNavigate(list[index + 1])}
        disabled={index === list.length - 1}
        className="absolute right-4 p-2 text-white hover:text-zinc-300 disabled:opacity-20 cursor-pointer"
      >
        <ChevronRight className="w-10 h-10" />
      </button>
    </div>
  );
}
