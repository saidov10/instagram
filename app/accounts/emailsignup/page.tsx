"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "../../context/AppContext";
<<<<<<< HEAD
import { Eye, EyeOff } from "lucide-react";
=======
import { ChevronLeft, HelpCircle } from "lucide-react";
>>>>>>> e17e1d9b21361cddd686ad374cd56cec6a91b154

export default function SignupPage() {
  const { setIsLoggedIn } = useApp();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [day, setDay] = useState("День");
  const [month, setMonth] = useState("Месяц");
  const [year, setYear] = useState("Год");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

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

<<<<<<< HEAD
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
=======
  const isFormValid = 
    emailOrPhone.length >= 5 && 
    password.length >= 6 && 
    day !== "День" && 
    month !== "Месяц" && 
    year !== "Год" &&
    fullName.trim().length >= 2 &&
    username.trim().length >= 3;

  // Generate lists for birthday selects
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];
  const years = Array.from({ length: 100 }, (_, i) => String(2026 - i));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col justify-between select-none">
      
      {/* ----------------- TOP NAVBAR ----------------- */}
      <header className="max-w-[580px] w-full mx-auto px-6 pt-6 flex flex-col items-start gap-4">
        <button
          onClick={() => router.push("/login")}
          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-full transition cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
        </button>
        
        {/* Meta Brand watermark */}
        <div className="flex items-center gap-1.5 text-zinc-500 text-sm font-semibold">
          <svg className="w-5 h-5 fill-blue-500 dark:fill-blue-400" viewBox="0 0 24 24">
            <path d="M16.92 10.02c-1.3-.92-3.08-.85-4.14.18l-.78.78-.78-.78c-1.06-1.03-2.84-1.1-4.14-.18-1.74 1.23-2.07 3.65-.8 5.25L12 21.25l5.72-5.98c1.27-1.6.94-4.02-.8-5.25zM12 2.25c-5.38 0-9.75 4.37-9.75 9.75 0 2.27.78 4.36 2.08 6.02L12 10.3l7.67 7.72c1.3-1.66 2.08-3.75 2.08-6.02 0-5.38-4.37-9.75-9.75-9.75z"/>
          </svg>
          <span className="text-[#0064e0] dark:text-blue-400 font-bold">Meta</span>
        </div>
      </header>

      {/* ----------------- FORM CONTAINER ----------------- */}
      <main className="flex-1 flex flex-col justify-center max-w-[580px] w-full mx-auto px-6 py-8">
        
        {/* Headings */}
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Зарегистрируйтесь в Instagram
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
            Зарегистрируйтесь, чтобы смотреть фото и видео ваших друзей.
>>>>>>> e17e1d9b21361cddd686ad374cd56cec6a91b154
          </p>
        </div>

<<<<<<< HEAD
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
=======
        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          {/* Email or Phone */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Мобильный телефон или электронный адрес
            </label>
            <input
              type="text"
              placeholder="Номер мобильного телефона или электронный адрес"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              className="w-full bg-[#f1f3f5] dark:bg-[#1c1c1e] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-700 outline-none rounded-xl px-4 py-4 text-base placeholder-zinc-500 text-zinc-900 dark:text-white transition"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
              Вы можете получать от нас уведомления.{" "}
              <a href="#" className="text-[#0064e0] dark:text-blue-400 font-bold hover:underline">
                Подробнее о том, почему мы запрашиваем вашу контактную информацию
              </a>
            </p>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Пароль
            </label>
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#f1f3f5] dark:bg-[#1c1c1e] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-700 outline-none rounded-xl px-4 py-4 text-base placeholder-zinc-500 text-zinc-900 dark:text-white transition"
            />
          </div>

          {/* Date of Birth */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-sm font-bold text-zinc-800 dark:text-zinc-200">
              <span>Дата рождения</span>
              <button type="button" className="text-zinc-400 hover:text-zinc-650 cursor-pointer">
                <HelpCircle className="w-4 h-4 stroke-[1.8px]" />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Day Dropdown */}
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full bg-[#f1f3f5] dark:bg-[#1c1c1e] border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-4 text-base text-zinc-800 dark:text-white outline-none cursor-pointer focus:border-zinc-400 dark:focus:border-zinc-700 appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
              >
                <option disabled value="День">День</option>
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Month Dropdown */}
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-[#f1f3f5] dark:bg-[#1c1c1e] border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-4 text-base text-zinc-800 dark:text-white outline-none cursor-pointer focus:border-zinc-400 dark:focus:border-zinc-700 appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
              >
                <option disabled value="Месяц">Месяц</option>
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-[#f1f3f5] dark:bg-[#1c1c1e] border border-zinc-250 dark:border-zinc-800 rounded-xl px-4 py-4 text-base text-zinc-800 dark:text-white outline-none cursor-pointer focus:border-zinc-400 dark:focus:border-zinc-700 appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
              >
                <option disabled value="Год">Год</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Full Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Название
            </label>
            <input
              type="text"
              placeholder="Имя и фамилия"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#f1f3f5] dark:bg-[#1c1c1e] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-700 outline-none rounded-xl px-4 py-4 text-base placeholder-zinc-500 text-zinc-900 dark:text-white transition"
            />
          </div>

          {/* Username */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              Имя пользователя
            </label>
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#f1f3f5] dark:bg-[#1c1c1e] border border-zinc-250 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-700 outline-none rounded-xl px-4 py-4 text-base placeholder-zinc-500 text-zinc-900 dark:text-white transition"
            />
          </div>

          {/* Policy Agreement text */}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed text-center px-4 mt-2">
            Регистрируясь, вы соглашаетесь с нашими{" "}
            <a href="#" className="text-[#0064e0] dark:text-blue-400 font-bold hover:underline">Условиями</a>,{" "}
            <a href="#" className="text-[#0064e0] dark:text-blue-400 font-bold hover:underline">Политикой конфиденциальности</a> и{" "}
            <a href="#" className="text-[#0064e0] dark:text-blue-400 font-bold hover:underline">Политикой в отношении файлов cookie</a>.
          </p>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="w-full bg-[#0095f6] hover:bg-[#18a2f8] disabled:bg-[#002d62]/55 disabled:text-zinc-500 text-white font-bold rounded-full py-4 text-base transition duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Зарегистрироваться
          </button>
        </form>

        {/* Redirect back to Login */}
        <div className="flex items-center justify-center gap-1.5 mt-8 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          <span>Есть аккаунт?</span>
          <Link href="/login" className="text-[#0064e0] dark:text-blue-400 font-bold hover:underline transition">
            Войти
          </Link>
        </div>

      </main>

      {/* ----------------- FOOTER ----------------- */}
      <footer className="w-full max-w-[580px] mx-auto px-6 py-6 border-t border-zinc-200 dark:border-zinc-900 flex justify-between items-center text-[11px] text-zinc-400 font-medium">
        <span>Русский</span>
        <span>© 2026 Instagram from Meta</span>
      </footer>
>>>>>>> e17e1d9b21361cddd686ad374cd56cec6a91b154

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
