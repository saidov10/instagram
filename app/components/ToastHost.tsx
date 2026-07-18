"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { subscribeToasts, dismissToast, ToastItem } from "../lib/toast";

/**
 * Renders the global toast stack. Mounted once (in ClientLayout). Instagram-style:
 * a dark rounded bar centered at the bottom, sliding up, auto-dismissing.
 */
export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto w-full flex items-center gap-3 px-4 py-3 rounded-2xl shadow-soft-lg bg-[#262626] text-white animate-in slide-in-from-bottom-3 fade-in duration-200"
        >
          {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />}
          {t.type === "error" && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
          <span className="flex-1 text-sm leading-snug">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            aria-label="Закрыть"
            className="text-white/60 hover:text-white transition flex-shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
