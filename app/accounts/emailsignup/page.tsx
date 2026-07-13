"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { registerUser, clearError } from "../../store/slices/authSlice";
import { AppDispatch, RootState } from "../../store/store";
import { ChevronLeft, HelpCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  // Form states
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [day, setDay] = useState("День");
  const [month, setMonth] = useState("Месяц");
  const [year, setYear] = useState("Год");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    
    const result = await dispatch(
      registerUser({
        userName: username,
        fullName,
        emailOrPhone,
        password,
        confirmPassword: password,
        day,
        month,
        year,
      })
    );

    if (registerUser.fulfilled.match(result)) {
      router.push("/login");
    }
  };

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
          onClick={() => {
            dispatch(clearError());
            router.push("/login");
          }}
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
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-650 dark:text-red-400 text-sm px-4 py-3.5 rounded-xl">
            {error}
          </div>
        )}

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
          <Link
            href="/login"
            onClick={() => dispatch(clearError())}
            className="text-[#0064e0] dark:text-blue-400 font-bold hover:underline transition"
          >
            Войти
          </Link>
        </div>

      </main>

      {/* ----------------- FOOTER ----------------- */}
      <footer className="w-full max-w-[580px] mx-auto px-6 py-6 border-t border-zinc-200 dark:border-zinc-900 flex justify-between items-center text-[11px] text-zinc-400 font-medium">
        <span>Русский</span>
        <span>© 2026 Instagram from Meta</span>
      </footer>

    </div>
  );
}
