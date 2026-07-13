"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "../../context/AppContext";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const { setIsLoggedIn } = useApp();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isContactValid = emailOrPhone.includes("@") || emailOrPhone.length >= 7;
  const isNameValid = fullName.trim().length >= 2;
  const isUsernameValid = username.trim().length >= 3;
  const isPasswordValid = password.length >= 6;

  const isSubmitEnabled =
    isContactValid && isNameValid && isUsernameValid && isPasswordValid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitEnabled) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setIsLoggedIn(true);
      router.push("/");
    }, 900);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-[350px] flex flex-col gap-2.5">
        {/* ---------- Card 1: signup ---------- */}
        <div className="border border-[#262626] bg-black rounded-[1px] px-10 pt-10 pb-6 flex flex-col items-center">
          {/* Wordmark placeholder — put your own brand name here */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] rounded-[10px] flex items-center justify-center">
              <svg
                className="w-[18px] h-[18px] fill-none"
                viewBox="0 0 24 24"
                stroke="white"
                strokeWidth={2}
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </div>
            <span className="text-[26px] leading-none font-semibold tracking-tight">
              Gram
            </span>
          </div>

          <p className="text-center text-[#a8a8a8] text-[17px] font-semibold leading-[20px] mb-4 mt-1">
            Sign up to see photos and videos from your friends.
          </p>

          {/* Facebook button */}
          <button
            type="button"
            onClick={() => {
              setIsLoggedIn(true);
              router.push("/");
            }}
            className="w-full bg-[#0095f6] hover:bg-[#1877f2] rounded-lg py-[7px] text-sm font-semibold flex items-center justify-center gap-2 transition mb-4"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z" />
            </svg>
            Log in with Facebook
          </button>

          {/* OR divider */}
          <div className="flex items-center w-full gap-4 mb-4">
            <div className="h-px bg-[#262626] flex-1" />
            <span className="text-[13px] font-semibold text-[#a8a8a8]">OR</span>
            <div className="h-px bg-[#262626] flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-1.5">
            <Field
              label="Mobile Number or Email"
              value={emailOrPhone}
              onChange={setEmailOrPhone}
            />
            <Field label="Full Name" value={fullName} onChange={setFullName} />
            <Field label="Username" value={username} onChange={setUsername} />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type={showPassword ? "text" : "password"}
              trailing={
                password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-[#a8a8a8] hover:text-white transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                )
              }
            />

            <p className="text-[12px] text-[#a8a8a8] text-center leading-[16px] mt-3">
              People who use our service may have uploaded your contact
              information.{" "}
              <a href="#" className="text-white font-semibold hover:underline">
                Learn More
              </a>
            </p>
            <p className="text-[12px] text-[#a8a8a8] text-center leading-[16px] mt-3">
              By signing up, you agree to our{" "}
              <a href="#" className="text-white font-semibold hover:underline">
                Terms
              </a>
              ,{" "}
              <a href="#" className="text-white font-semibold hover:underline">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="#" className="text-white font-semibold hover:underline">
                Cookies Policy
              </a>
              .
            </p>

            <button
              type="submit"
              disabled={!isSubmitEnabled || loading}
              className="w-full mt-4 bg-[#0095f6] hover:bg-[#1877f2] disabled:bg-[#0095f6]/40 disabled:cursor-default text-white text-sm font-semibold rounded-lg py-[7px] flex items-center justify-center gap-2 transition"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Sign up
            </button>
          </form>
        </div>

        {/* ---------- Card 2: log in switch ---------- */}
        <div className="border border-[#262626] bg-black rounded-[1px] py-[22px] text-center text-sm">
          <span className="text-white">Have an account? </span>
          <Link
            href="/login"
            className="text-[#0095f6] font-semibold hover:underline"
          >
            Log in
          </Link>
        </div>

        {/* ---------- App download ---------- */}
        <div className="flex flex-col items-center gap-4 mt-3">
          <p className="text-sm text-white">Get the app.</p>
          <div className="flex gap-2">
            <StoreBadge top="Download on the" bottom="App Store" />
            <StoreBadge top="Get it on" bottom="Google Play" />
          </div>
        </div>
      </div>

      {/* ---------- Footer ---------- */}
      <footer className="mt-14 text-center text-[12px] text-[#737373] flex flex-col gap-4">
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2 max-w-2xl">
          {[
            "Meta",
            "About",
            "Blog",
            "Jobs",
            "Help",
            "API",
            "Privacy",
            "Terms",
            "Locations",
            "Contact Uploading & Non-Users",
          ].map((item) => (
            <a key={item} href="#" className="hover:underline">
              {item}
            </a>
          ))}
        </nav>
        <p>© {new Date().getFullYear()} Gram</p>
      </footer>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="relative flex items-center bg-[#121212] border border-[#262626] focus-within:border-[#4d4d4d] rounded-[3px] px-2 h-[38px] transition">
      <div className="relative flex-1">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder=" "
          className="peer w-full bg-transparent outline-none text-[12px] text-white pt-[14px] pb-[2px] px-1"
        />
        <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[12px] text-[#a8a8a8] transition-all peer-focus:top-[9px] peer-focus:text-[10px] peer-[:not(:placeholder-shown)]:top-[9px] peer-[:not(:placeholder-shown)]:text-[10px]">
          {label}
        </span>
      </div>
      {trailing && <div className="pl-2">{trailing}</div>}
    </label>
  );
}

function StoreBadge({ top, bottom }: { top: string; bottom: string }) {
  return (
    <a
      href="#"
      className="flex items-center gap-2 bg-[#121212] border border-[#262626] rounded-md px-3 py-1.5 hover:bg-[#1c1c1e] transition"
    >
      <div className="w-5 h-5 rounded bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" />
      <div className="text-left leading-tight">
        <div className="text-[8px] text-[#a8a8a8] uppercase">{top}</div>
        <div className="text-[11px] font-semibold text-white">{bottom}</div>
      </div>
    </a>
  );
}
