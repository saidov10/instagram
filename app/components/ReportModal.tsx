"use client";

import React, { useState } from "react";
import { X, Flag, Check } from "lucide-react";
import { api } from "../services/api";

export type ReportTargetType = "POST" | "COMMENT" | "STORY" | "USER";

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
}

const REASONS = [
  "Спам",
  "Насилие или опасные организации",
  "Буллинг или преследование",
  "Ненавистнические высказывания",
  "Нагота или сексуальный контент",
  "Ложная информация",
  "Мошенничество или обман",
  "Нарушение прав интеллектуальной собственности",
  "Мне это просто не нравится",
];

const TARGET_LABEL: Record<ReportTargetType, string> = {
  POST: "публикацию",
  COMMENT: "комментарий",
  STORY: "историю",
  USER: "аккаунт",
};

/** Reason-picker modal that submits a report for any reportable entity. */
export default function ReportModal({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.report.sendReport({
        targetType: target.type,
        targetId: String(target.id),
        reason: selected,
      });
      setDone(true);
      setTimeout(onClose, 1600);
    } catch (err: any) {
      console.error("Failed to send report:", err);
      setError(err?.message || "Не удалось отправить жалобу. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass-strong rounded-3xl shadow-soft-lg w-full max-w-sm flex flex-col overflow-hidden max-h-[85vh] animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-7 h-7 text-white" />
            </div>
            <h3 className="font-bold text-base">Спасибо за обращение</h3>
            <p className="text-sm text-zinc-500">Мы изучим вашу жалобу.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Flag className="w-4.5 h-4.5" /> Пожаловаться на {TARGET_LABEL[target.type]}
              </h3>
              <button onClick={onClose} className="hover:opacity-75 cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col overflow-y-auto no-scrollbar divide-y divide-[var(--border)]">
              {REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelected(reason)}
                  className={`flex items-center justify-between px-5 py-3.5 text-sm text-left transition cursor-pointer ${
                    selected === reason
                      ? "bg-black/5 dark:bg-white/5 font-semibold"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {reason}
                  {selected === reason && <Check className="w-4 h-4 text-[var(--accent-2)] flex-shrink-0" />}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-[var(--border)] flex flex-col gap-2">
              {error && <span className="text-xs font-semibold text-red-500">{error}</span>}
              <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                className="w-full py-2.5 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 cursor-pointer transition"
              >
                {submitting ? "Отправка..." : "Отправить жалобу"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
