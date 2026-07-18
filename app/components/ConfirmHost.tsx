"use client";

import React, { useEffect, useState } from "react";
import { subscribeConfirm, answerConfirm, PendingConfirm } from "../lib/confirm";

/**
 * Renders the active confirm dialog (Instagram-style action sheet: stacked buttons,
 * destructive action in red). Mounted once in the root layout. Enter confirms, Esc /
 * backdrop cancels.
 */
export default function ConfirmHost() {
  const [current, setCurrent] = useState<PendingConfirm | null>(null);

  useEffect(() => subscribeConfirm(setCurrent), []);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") answerConfirm(current.id, false);
      else if (e.key === "Enter") answerConfirm(current.id, true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => answerConfirm(current.id, false)}
    >
      <div
        className="glass-strong w-full max-w-[300px] rounded-2xl overflow-hidden shadow-soft-lg animate-pop-in text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5">
          <h3 className="font-bold text-base">{current.title ?? "Подтвердите действие"}</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 leading-snug">{current.message}</p>
        </div>
        <div className="flex flex-col border-t border-[var(--border)]">
          <button
            onClick={() => answerConfirm(current.id, true)}
            className={`py-3 text-sm font-bold cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition ${
              current.destructive ? "text-[var(--like-red)]" : "text-[var(--accent-blue)]"
            }`}
          >
            {current.confirmText ?? "Подтвердить"}
          </button>
          <button
            onClick={() => answerConfirm(current.id, false)}
            className="py-3 text-sm border-t border-[var(--border)] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition"
          >
            {current.cancelText ?? "Отмена"}
          </button>
        </div>
      </div>
    </div>
  );
}
