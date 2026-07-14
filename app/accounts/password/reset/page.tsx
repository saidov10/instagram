"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "../../../services/api";
import { CircleUserRound, Lock } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);
    try {
      await api.account.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось отправить ссылку. Попробуйте ещё раз."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center px-4 py-10 select-none">
      <div className="w-full max-w-[350px] border border-zinc-200 dark:border-zinc-800 rounded-sm">
        <div className="px-10 py-8 flex flex-col items-center">
          {/* Lock glyph */}
          <div className="w-24 h-24 rounded-full border-2 border-zinc-900 dark:border-zinc-100 flex items-center justify-center mb-4">
            <Lock className="w-11 h-11" strokeWidth={1.4} />
          </div>

          {sent ? (
            <>
              <h1 className="font-semibold text-base mb-3 text-center">
                Ссылка отправлена
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center leading-snug mb-6">
                Мы отправили ссылку для сброса пароля на{" "}
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {email}
                </span>
                . Проверьте почту и следуйте инструкциям.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="text-blue-500 text-sm font-semibold hover:underline cursor-pointer"
              >
                Отправить ещё раз
              </button>
            </>
          ) : (
            <>
              <h1 className="font-semibold text-base mb-2 text-center">
                Не удаётся войти?
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center leading-snug mb-5">
                Введите эл. адрес, и мы отправим вам ссылку для восстановления
                доступа к аккаунту.
              </p>

              <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Эл. адрес"
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 outline-none rounded-sm px-3 py-2 text-xs placeholder-zinc-500 transition"
                />

                {error && (
                  <p className="text-xs text-red-500 text-center leading-snug">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!isValid || loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-default text-white text-sm font-semibold rounded-lg py-1.5 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {loading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Отправить ссылку
                </button>
              </form>

              <Link
                href="/accounts/emailsignup"
                className="text-xs font-semibold mt-5 hover:underline flex items-center gap-1.5"
              >
                <CircleUserRound className="w-4 h-4" />
                Создать новый аккаунт
              </Link>
            </>
          )}
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-4 px-10 pb-6">
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
          <span className="text-xs font-semibold text-zinc-500">ИЛИ</span>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
        </div>

        {/* Back to login */}
        <Link
          href="/login"
          className="block bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 py-4 text-center text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition"
        >
          Вернуться ко входу
        </Link>
      </div>

      <p className="mt-6 text-xs text-zinc-400 text-center max-w-[350px] leading-snug">
        Ссылка действительна ограниченное время. Если письмо не пришло, проверьте
        папку «Спам».
      </p>
    </div>
  );
}
