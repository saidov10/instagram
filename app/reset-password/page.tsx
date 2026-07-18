"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Check } from "lucide-react";
import { api } from "../services/api";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    email.trim().length > 3 &&
    token.trim().length > 0 &&
    password.length >= 6 &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setBusy(true);
    setError(null);
    try {
      await api.account.resetPassword({
        Token: token.trim(),
        Email: email.trim(),
        Password: password,
        ConfirmPassword: confirmPassword,
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Could not reset your password. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-white select-none p-6">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/login")}
            className="p-1 hover:bg-zinc-800 rounded-full transition cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-xl font-bold text-white">Reset your password</h2>
        </div>

        {done ? (
          <div className="flex flex-col items-center text-center gap-4 py-6 bg-[#1c1c1e] border border-zinc-800 rounded-2xl px-6">
            <div className="w-14 h-14 rounded-full bg-[#0095f6]/15 flex items-center justify-center">
              <Check className="w-7 h-7 text-[#0095f6]" />
            </div>
            <h3 className="text-lg font-bold text-white">Password updated</h3>
            <p className="text-sm text-zinc-400">You can now log in with your new password.</p>
            <Link
              href="/login"
              className="w-full mt-2 bg-[#0095f6] hover:bg-[#18a2f8] text-white font-bold rounded-full py-3 text-sm cursor-pointer text-center"
            >
              Go to log in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 bg-[#1c1c1e] border border-zinc-800 rounded-2xl p-6">
            <p className="text-sm text-zinc-400 -mt-1">
              Enter the reset code we sent to your email, then choose a new password.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#121212] border border-zinc-800 focus:border-zinc-700 outline-none rounded-xl px-4 py-3 text-sm placeholder-zinc-500 text-white transition"
            />
            <input
              type="text"
              placeholder="Reset code"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-[#121212] border border-zinc-800 focus:border-zinc-700 outline-none rounded-xl px-4 py-3 text-sm placeholder-zinc-500 text-white transition"
            />
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121212] border border-zinc-800 focus:border-zinc-700 outline-none rounded-xl px-4 py-3 text-sm placeholder-zinc-500 text-white transition"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#121212] border border-zinc-800 focus:border-zinc-700 outline-none rounded-xl px-4 py-3 text-sm placeholder-zinc-500 text-white transition"
            />
            {password && confirmPassword && password !== confirmPassword && (
              <span className="text-xs text-red-400 -mt-2">Passwords don't match.</span>
            )}

            <button
              type="submit"
              disabled={!isValid || busy}
              className="w-full mt-1 bg-[#0095f6] hover:bg-[#18a2f8] disabled:bg-[#002d62]/55 disabled:text-zinc-500 text-white font-bold rounded-full py-3.5 text-sm transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {busy && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Reset password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
