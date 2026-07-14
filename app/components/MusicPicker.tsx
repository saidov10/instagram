"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X, Play, Pause, Music } from "lucide-react";
import { api, getFullImageUrl } from "../services/api";

/** A track as the rest of the app consumes it (notes, reels). */
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverUrl: string;
  durationMs: number;
}

/** Previews are capped so a full song can't play out inside the picker. */
const PREVIEW_MS = 30000;

/** Field names vary across catalogue providers — accept the common spellings. */
export const formatTrack = (raw: any): MusicTrack | null => {
  const audioUrl = raw?.audioUrl || raw?.previewUrl || raw?.preview || raw?.url || "";
  if (!audioUrl) return null;

  const id = String(raw?.id ?? raw?.trackId ?? raw?.audioId ?? audioUrl);
  const durationMs = Number(
    raw?.durationMs ?? (raw?.duration != null ? Number(raw.duration) * 1000 : PREVIEW_MS)
  );

  return {
    id,
    title: raw?.title || raw?.name || raw?.trackName || "Без названия",
    artist: raw?.artist || raw?.artistName || raw?.author || "Неизвестный исполнитель",
    audioUrl,
    coverUrl: getFullImageUrl(raw?.coverUrl || raw?.artworkUrl || raw?.cover || raw?.image || raw?.albumArt),
    durationMs: Number.isFinite(durationMs) && durationMs > 0 ? durationMs : PREVIEW_MS,
  };
};

interface MusicPickerProps {
  onSelect: (track: MusicTrack) => void;
  onClose: () => void;
}

/**
 * Modal music browser: recommended tracks on open, debounced search, 30s previews.
 * Picking a track hands it to the caller and closes.
 */
export default function MusicPicker({ onSelect, onClose }: MusicPickerProps) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recommendations on open, then debounced search on every keystroke.
  useEffect(() => {
    let cancelled = false;

    const t = setTimeout(async () => {
      if (cancelled) return;
      // Flipped here rather than in the effect body, so the spinner appears when the request
      // actually fires instead of flickering on every keystroke during the debounce.
      setLoading(true);
      try {
        const raw = await api.music.search(query);
        if (cancelled) return;
        setTracks((raw || []).map(formatTrack).filter(Boolean) as MusicTrack[]);
        setError(null);
      } catch (err: any) {
        if (cancelled) return;
        setTracks([]);
        setError(err?.message || "Не удалось загрузить музыку.");
      } finally {
        if (!cancelled) setLoading(false);
      }
      // No debounce on the very first load — only while typing.
    }, query ? 350 : 0);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const stopPreview = () => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  };

  // Never leave audio playing behind a closed modal.
  useEffect(() => stopPreview, []);

  const togglePreview = (track: MusicTrack) => {
    if (playingId === track.id) {
      stopPreview();
      return;
    }
    stopPreview();

    const audio = new Audio(track.audioUrl);
    audioRef.current = audio;
    audio.onended = () => stopPreview();
    audio.play().catch(() => {
      // Autoplay policies or a dead URL — surface it rather than showing a stuck play button.
      setError("Не удалось воспроизвести превью.");
      stopPreview();
    });
    setPlayingId(track.id);
    previewTimer.current = setTimeout(stopPreview, PREVIEW_MS);
  };

  const handlePick = (track: MusicTrack) => {
    stopPreview();
    onSelect(track);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-70 flex items-center justify-center p-4"
      onClick={() => {
        stopPreview();
        onClose();
      }}
    >
      <div
        className="glass-strong rounded-3xl shadow-soft-lg w-full max-w-md flex flex-col overflow-hidden animate-pop-in max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Music className="w-4.5 h-4.5" /> Музыка
          </h3>
          <button
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="hover:opacity-75 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[var(--border)]">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск музыки..."
              className="w-full glass rounded-xl pl-10 pr-9 py-2.5 text-sm outline-none text-zinc-900 dark:text-white"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 no-scrollbar">
          {!query.trim() && !loading && tracks.length > 0 && (
            <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 px-2 py-1">
              Рекомендуемое
            </span>
          )}

          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-11 h-11 rounded-lg shimmer flex-shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="w-32 h-3 rounded-full shimmer" />
                  <div className="w-20 h-2.5 rounded-full shimmer" />
                </div>
              </div>
            ))
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-10">{error}</p>
          ) : tracks.length === 0 ? (
            <p className="text-sm text-zinc-450 text-center py-10">
              {query.trim() ? "Ничего не найдено." : "Треков пока нет."}
            </p>
          ) : (
            tracks.map((track) => {
              const isPlaying = playingId === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => handlePick(track)}
                  className="flex items-center gap-3 p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition"
                >
                  {/* Cover + play overlay */}
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-200 dark:bg-zinc-800">
                    {track.coverUrl ? (
                      <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-zinc-500" />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        // Previewing must not count as picking the track.
                        e.stopPropagation();
                        togglePreview(track);
                      }}
                      title={isPlaying ? "Пауза" : "Слушать превью"}
                      className="absolute inset-0 bg-black/45 hover:bg-black/60 flex items-center justify-center text-white transition cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-semibold truncate">{track.title}</span>
                    <span className="text-xs text-zinc-450 truncate">{track.artist}</span>
                  </div>

                  {isPlaying && (
                    <span className="text-[10px] font-bold text-[var(--accent-2)] flex-shrink-0">
                      Играет
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
