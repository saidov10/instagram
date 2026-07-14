"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../../services/api";
import { Lock, Eye, EyeOff, Check } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("Token") ?? searchParams.get("token") ?? "";
  const email = searchParams.get("Email") ?? searchParams.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLongEnough = password.length >= 6;
  const matches = password === confirmPassword && confirmPassword.length > 0;
  const isValid = isLongEnough && matches;

  const linkIsBroken = !token || !email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);
    try {
      await api.account.resetPassword({
        Token: token,
        Email: email,
        Password: password,
        ConfirmPassword: confirmPassword,
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось сменить пароль. Возможно, ссылка устарела."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[350px] border border-zinc-200 dark:border-zinc-800 rounded-sm">
      <div className="px-10 py-8 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full border-2 border-zinc-900 dark:border-zinc-100 flex items-center justify-center mb-4">
          <Lock className="w-11 h-11" strokeWidth={1.4} />
        </div>

        {done ? (
          <>
            <h1 className="font-semibold text-base mb-3 text-center flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500" />
              Пароль изменён
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center leading-snug">
              Сейчас вы будете перенаправлены на страницу входа.
            </p>
          </>
        ) : linkIsBroken ? (
          <>
            <h1 className="font-semibold text-base mb-2 text-center">
              Ссылка недействительна
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center leading-snug mb-5">
              В ссылке нет токена или эл. адреса. Запросите новую ссылку для
              сброса пароля.
            </p>
            <Link
              href="/accounts/password/reset"
              className="text-blue-500 text-sm font-semibold hover:underline"
            >
              Запросить новую ссылку
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-semibold text-base mb-2 text-center">
              Создайте новый пароль
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center leading-snug mb-5">
              Новый пароль для{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {email}
              </span>
              . Он должен содержать не менее 6 символов.
            </p>

            <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Новый пароль"
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 outline-none rounded-sm pl-3 pr-9 py-2 text-xs placeholder-zinc-500 transition"
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Подтвердите новый пароль"
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 outline-none rounded-sm px-3 py-2 text-xs placeholder-zinc-500 transition"
              />

              {password.length > 0 && !isLongEnough && (
                <p className="text-xs text-zinc-500 leading-snug">
                  Пароль должен содержать не менее 6 символов.
                </p>
              )}
              {confirmPassword.length > 0 && !matches && (
                <p className="text-xs text-red-500 leading-snug">
                  Пароли не совпадают.
                </p>
              )}
              {error && (
                <p className="text-xs text-red-500 text-center leading-snug">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full mt-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-default text-white text-sm font-semibold rounded-lg py-1.5 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Сменить пароль
              </button>
            </form>
          </>
        )}
      </div>

      <Link
        href="/login"
        className="block bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 py-4 text-center text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition"
      >
        Вернуться ко входу
      </Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center px-4 py-10 select-none">
      <Suspense
        fallback={
          <div className="w-full max-w-[350px] h-80 border border-zinc-200 dark:border-zinc-800 rounded-sm animate-pulse" />
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
