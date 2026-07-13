"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../context/AppContext";
import { ChevronLeft } from "lucide-react";

export default function LoginPage() {
  const { setIsLoggedIn } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form states
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate login redirect
    setTimeout(() => {
      setLoading(false);
      setIsLoggedIn(true);
      router.push("/");
    }, 1000);
  };

  const isFormValid = emailOrUser.length >= 3 && password.length >= 6;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#000000] text-white select-none overflow-hidden">
      
      {/* ----------------- LEFT PANE: BRAND COLLAGE ----------------- */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#000000] border-b md:border-b-0 md:border-r border-zinc-900 relative">
        <div className="max-w-md w-full flex flex-col items-center text-center gap-8 z-10">
          {/* Instagram Glyph Gradient Logo */}
          <div className="relative w-20 h-20 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-2xl flex items-center justify-center shadow-xl">
            <svg className="w-12 h-12 text-white fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            See everyday moments from your <br />
            <span className="bg-gradient-to-r from-[#ee2a7b] via-[#b62fbb] to-[#6228d7] bg-clip-text text-transparent font-extrabold">
              close friends.
            </span>
          </h1>

          {/* Rotated overlapping collage cards */}
          <div className="relative w-full h-72 mt-8 flex justify-center items-center">
            {/* Card 1 (Left background) */}
            <div className="absolute left-[15%] w-36 h-52 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl -rotate-12 overflow-hidden opacity-60 scale-90 origin-bottom transform transition duration-500 hover:rotate-0 hover:scale-100 hover:opacity-100 z-10">
              <img
                src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=300&fit=crop"
                alt="Story Left"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Card 2 (Center foreground) */}
            <div className="absolute w-40 h-56 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden z-30 transition duration-500 hover:scale-105">
              <img
                src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=300&fit=crop"
                alt="Story Center"
                className="w-full h-full object-cover"
              />
              {/* Fake stories progress bars overlay */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex gap-1 z-40">
                <div className="h-0.5 bg-white/80 flex-1 rounded" />
                <div className="h-0.5 bg-white/30 flex-1 rounded" />
              </div>
            </div>

            {/* Card 3 (Right background) */}
            <div className="absolute right-[15%] w-36 h-52 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl rotate-12 overflow-hidden opacity-60 scale-90 origin-bottom transform transition duration-500 hover:rotate-0 hover:scale-100 hover:opacity-100 z-20">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=300&fit=crop"
                alt="Story Right"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Ambient glow backgrounds */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#ee2a7b]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#6228d7]/10 blur-3xl" />
      </div>

      {/* ----------------- RIGHT PANE: LOGIN FORM ----------------- */}
      <div className="flex-1 flex flex-col justify-between items-center p-8 bg-[#121212] md:p-16 relative">
        <div className="my-auto w-full max-w-sm flex flex-col gap-6">
          
          {/* Header Link */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => router.push("/")}
              className="p-1 hover:bg-zinc-800 rounded-full transition cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <h2 className="text-xl font-bold text-white">Log into Instagram</h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Username/Email Input */}
            <input
              type="text"
              placeholder="Mobile number, username or email"
              value={emailOrUser}
              onChange={(e) => setEmailOrUser(e.target.value)}
              className="w-full bg-[#1c1c1e] border border-zinc-800 focus:border-zinc-700 outline-none rounded-xl px-4 py-3 text-sm placeholder-zinc-500 text-white transition"
            />

            {/* Password Input */}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1c1c1e] border border-zinc-800 focus:border-zinc-700 outline-none rounded-xl px-4 py-3 text-sm placeholder-zinc-500 text-white transition"
            />

            {/* Log In Button */}
            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full mt-2 bg-[#0095f6] hover:bg-[#18a2f8] disabled:bg-[#002d62]/55 disabled:text-zinc-500 text-white font-bold rounded-full py-3.5 text-sm transition-colors duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Log in
            </button>
          </form>

          {/* Forgot Password Link */}
          <a
            href="#"
            className="text-white hover:underline text-sm font-semibold text-center mt-1.5 transition"
          >
            Forgot password?
          </a>

          {/* Facebook Sign In option */}
          <button
            type="button"
            onClick={() => {
              setIsLoggedIn(true);
              router.push("/");
            }}
            className="w-full border border-zinc-800 hover:bg-zinc-900 rounded-full py-3 text-sm font-bold text-white transition cursor-pointer flex items-center justify-center gap-2"
          >
            {/* Facebook F logo outline */}
            <svg className="w-5 h-5 fill-[#1877f2]" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
            </svg>
            Log in with Facebook
          </button>

          {/* Sign Up Switch Option */}
          <button
            type="button"
            onClick={() => router.push("/accounts/emailsignup")}
            className="w-full border border-[#0095f6] hover:bg-[#0095f6]/10 rounded-full py-3 text-sm font-bold text-[#0095f6] transition cursor-pointer"
          >
            Create new account
          </button>

        </div>

        {/* Footer Meta Logo */}
        <div className="mt-8 flex items-center gap-1.5 text-zinc-500 text-sm">
          <svg className="w-5 h-5 fill-current opacity-70" viewBox="0 0 24 24">
            <path d="M16.92 10.02c-1.3-.92-3.08-.85-4.14.18l-.78.78-.78-.78c-1.06-1.03-2.84-1.1-4.14-.18-1.74 1.23-2.07 3.65-.8 5.25L12 21.25l5.72-5.98c1.27-1.6.94-4.02-.8-5.25zM12 2.25c-5.38 0-9.75 4.37-9.75 9.75 0 2.27.78 4.36 2.08 6.02L12 10.3l7.67 7.72c1.3-1.66 2.08-3.75 2.08-6.02 0-5.38-4.37-9.75-9.75-9.75z"/>
          </svg>
          Meta
        </div>

      </div>

    </div>
  );
}
