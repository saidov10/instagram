"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Pencil, Check } from "lucide-react";
import { api, getFullImageUrl } from "../services/api";
import SmartImage from "./SmartImage";

export interface Highlight {
  id: string;
  title: string;
  cover: string;
  storyIds: number[];
}

interface ArchivedStory {
  id: number;
  image: string;
  createAt: string;
}

const mapHighlight = (h: any): Highlight => ({
  id: String(h.id ?? h.highlightId ?? ""),
  title: h.title || "Актуальное",
  cover: getFullImageUrl(h.cover || h.coverImage),
  storyIds: (h.storyIds || h.stories || [])
    .map((s: any) => (typeof s === "number" ? s : s?.id ?? s?.storyId))
    .filter((id: any): id is number => typeof id === "number"),
});

const mapArchivedStory = (s: any): ArchivedStory => ({
  id: s.id ?? s.storyId,
  image: getFullImageUrl(s.fileName || s.imagePath || s.image),
  createAt: s.createAt || s.createdAt || "",
});

/**
 * Horizontal Highlights row for a profile. When `isOwner` is true it also renders the
 * create/edit/delete affordances backed by the story archive.
 */
export default function Highlights({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  // Story viewer for an opened highlight
  const [viewing, setViewing] = useState<{ highlight: Highlight; stories: ArchivedStory[]; index: number } | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  // Create / edit modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Highlight | null>(null);
  const [archive, setArchive] = useState<ArchivedStory[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await api.highlight.getUserHighlights(userId);
      setHighlights((list || []).map(mapHighlight).filter((h) => h.id));
    } catch (err) {
      console.error("Failed to load highlights:", err);
      setHighlights([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Viewing a highlight ----
  const openHighlight = async (highlight: Highlight) => {
    if (highlight.storyIds.length === 0) return;
    setViewerLoading(true);
    try {
      const stories = await Promise.all(
        highlight.storyIds.map((id) =>
          api.story.getStoryById(id).then(mapArchivedStory).catch(() => null)
        )
      );
      const resolved = stories.filter((s): s is ArchivedStory => !!s && !!s.image);
      if (resolved.length > 0) setViewing({ highlight, stories: resolved, index: 0 });
    } catch (err) {
      console.error("Failed to open highlight:", err);
    } finally {
      setViewerLoading(false);
    }
  };

  // ---- Create / edit ----
  const openEditor = async (highlight?: Highlight) => {
    setEditing(highlight || null);
    setTitle(highlight?.title || "");
    setSelectedIds(highlight?.storyIds || []);
    setError(null);
    setEditorOpen(true);

    setArchiveLoading(true);
    try {
      const list = await api.story.getArchivedStories();
      setArchive((list || []).map(mapArchivedStory).filter((s) => s.id));
    } catch (err) {
      console.error("Failed to load archived stories:", err);
      setArchive([]);
    } finally {
      setArchiveLoading(false);
    }
  };

  const toggleStory = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = async () => {
    if (!title.trim() || selectedIds.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Cover defaults to the first selected story's image.
      const cover = archive.find((s) => s.id === selectedIds[0])?.image || editing?.cover || "";
      if (editing) {
        await api.highlight.updateHighlight(editing.id, { title: title.trim(), cover, storyIds: selectedIds });
      } else {
        await api.highlight.createHighlight({ title: title.trim(), cover, storyIds: selectedIds });
      }
      setEditorOpen(false);
      await load();
    } catch (err: any) {
      console.error("Failed to save highlight:", err);
      setError(err?.message || "Не удалось сохранить. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Удалить эту папку «Актуальное»?")) return;
    const snapshot = highlights;
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    try {
      await api.highlight.deleteHighlight(id);
    } catch (err) {
      console.error("Failed to delete highlight:", err);
      setHighlights(snapshot);
    }
  };

  // ---- Drag-reorder (section D) ----
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const reordered = [...highlights];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setDragIndex(null);
    const snapshot = highlights;
    setHighlights(reordered);
    try {
      // The backend requires the full ordered id list.
      await api.highlight.reorderHighlights(reordered.map((h) => h.id));
    } catch (err) {
      console.error("Failed to reorder highlights:", err);
      setHighlights(snapshot);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-6 px-2 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full shimmer" />
            <div className="w-12 h-2.5 rounded-full shimmer" />
          </div>
        ))}
      </div>
    );
  }

  // Nothing to show and nothing the visitor can do about it.
  if (highlights.length === 0 && !isOwner) return null;

  return (
    <>
      <div className="flex gap-6 px-2 py-2 overflow-x-auto no-scrollbar">
        {isOwner && (
          <button
            onClick={() => openEditor()}
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center group-hover:scale-105 transition">
              <Plus className="w-6 h-6 text-zinc-450" />
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[72px] truncate">Новое</span>
          </button>
        )}

        {highlights.map((h, hi) => (
          <div
            key={h.id}
            draggable={isOwner}
            onDragStart={() => isOwner && setDragIndex(hi)}
            onDragOver={(e) => isOwner && e.preventDefault()}
            onDrop={() => isOwner && handleDrop(hi)}
            className={`flex flex-col items-center gap-2 flex-shrink-0 relative group ${dragIndex === hi ? "opacity-40" : ""} ${isOwner ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <button
              onClick={() => openHighlight(h)}
              disabled={viewerLoading}
              className="cursor-pointer disabled:opacity-60"
            >
              <div className="w-16 h-16 rounded-full p-[2px] border border-zinc-300 dark:border-zinc-700 group-hover:scale-105 transition overflow-hidden">
                {h.cover ? (
                  <SmartImage src={h.cover} alt={h.title} width={128} height={128} sizes="64px" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
                )}
              </div>
            </button>
            <span className="text-xs text-zinc-700 dark:text-zinc-300 max-w-[72px] truncate">{h.title}</span>

            {isOwner && (
              <div className="absolute -top-1 -right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => openEditor(h)}
                  title="Изменить"
                  className="p-1 rounded-full glass-strong shadow-soft cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(h.id)}
                  title="Удалить"
                  className="p-1 rounded-full glass-strong shadow-soft text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ----------------- HIGHLIGHT STORY VIEWER ----------------- */}
      {viewing && (
        <div
          className="fixed inset-0 bg-black/95 z-55 flex items-center justify-center p-4 select-none"
          onClick={() => setViewing(null)}
        >
          <button className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2 cursor-pointer">
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewing((v) => (v && v.index > 0 ? { ...v, index: v.index - 1 } : v));
            }}
            disabled={viewing.index === 0}
            className="absolute left-4 p-2 text-white hover:text-zinc-300 disabled:opacity-20 cursor-pointer"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          <div
            className="relative w-full max-w-md h-[80vh] rounded-xl overflow-hidden shadow-2xl bg-zinc-950 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Segment progress bars */}
            <div className="absolute top-2 left-3 right-3 z-20 flex gap-1">
              {viewing.stories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 bg-white/30 rounded overflow-hidden">
                  <div className={`h-full bg-white ${i <= viewing.index ? "w-full" : "w-0"}`} />
                </div>
              ))}
            </div>

            <div className="absolute top-0 left-0 right-0 p-4 pt-6 bg-gradient-to-b from-black/80 to-transparent z-10">
              <span className="text-white font-semibold text-sm drop-shadow">{viewing.highlight.title}</span>
            </div>

            <SmartImage src={viewing.stories[viewing.index].image} alt="Highlight" fill sizes="(max-width: 768px) 100vw, 448px" className="object-contain" />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewing((v) => (v && v.index < v.stories.length - 1 ? { ...v, index: v.index + 1 } : v));
            }}
            disabled={viewing.index === viewing.stories.length - 1}
            className="absolute right-4 p-2 text-white hover:text-zinc-300 disabled:opacity-20 cursor-pointer"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </div>
      )}

      {/* ----------------- CREATE / EDIT HIGHLIGHT MODAL ----------------- */}
      {editorOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditorOpen(false)}
        >
          <div
            className="glass-strong rounded-3xl shadow-soft-lg w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh] animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="font-bold text-base">
                {editing ? "Изменить актуальное" : "Новое актуальное"}
              </h3>
              <button onClick={() => setEditorOpen(false)} className="hover:opacity-75 cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <input
                type="text"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название"
                className="w-full glass rounded-xl px-3.5 py-2.5 text-sm outline-none text-zinc-900 dark:text-white"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                  Истории из архива
                </span>
                <span className="text-[11px] text-zinc-450">Выбрано: {selectedIds.length}</span>
              </div>

              {archiveLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[9/16] rounded-xl shimmer" />
                  ))}
                </div>
              ) : archive.length === 0 ? (
                <p className="text-sm text-zinc-450 text-center py-8">
                  В архиве пока нет историй. Они появляются здесь через 24 часа после публикации.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {archive.map((s) => {
                    const selected = selectedIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleStory(s.id)}
                        className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer transition ${
                          selected ? "ring-2 ring-[var(--accent-2)] scale-95" : "hover:opacity-80"
                        }`}
                      >
                        <SmartImage src={s.image} alt="" fill sizes="150px" className="object-cover" />
                        {selected && (
                          <span className="absolute top-1 right-1 w-5 h-5 rounded-full btn-grad flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
            </div>

            <div className="p-4 border-t border-[var(--border)]">
              <button
                onClick={handleSave}
                disabled={!title.trim() || selectedIds.length === 0 || saving}
                className="w-full btn-grad py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Сохранение..." : editing ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
