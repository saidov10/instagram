"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

const CURRENT_USER = {
  username: "saaidov.7",
  name: "Мардин Саидов",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
};

export default function EditProfilePage() {
  const router = useRouter();

  const [avatar, setAvatar] = useState(CURRENT_USER.avatar);
  const [name, setName] = useState(CURRENT_USER.name);
  const [username, setUsername] = useState(CURRENT_USER.username);
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("Не указан");
  const [showSuggestions, setShowSuggestions] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setAvatar(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 800);
  };

  const BIO_LIMIT = 150;

  return (
    <div className="w-full max-w-[700px] mx-auto px-4 py-8 select-none text-zinc-900 dark:text-zinc-100 min-h-[85vh]">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Редактировать профиль</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Avatar row */}
        <div className="flex items-center gap-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
          <img
            src={avatar}
            alt={username}
            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-semibold text-sm truncate">{username}</span>
            <span className="text-zinc-500 text-sm truncate">{name}</span>
          </div>
          <label className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer transition flex-shrink-0">
            Сменить фото
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </label>
        </div>

        <Row label="Имя">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 outline-none rounded-lg px-3 py-2 text-sm transition"
          />
          <Hint>
            Помогите людям найти ваш аккаунт по имени. Вы можете изменить имя
            только дважды за 14 дней.
          </Hint>
        </Row>

        <Row label="Имя пользователя">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-transparent border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 outline-none rounded-lg px-3 py-2 text-sm transition"
          />
        </Row>

        <Row label="Веб-сайт">
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Веб-сайт"
            className="w-full bg-transparent border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 outline-none rounded-lg px-3 py-2 text-sm placeholder-zinc-500 transition"
          />
        </Row>

        <Row label="О себе">
          <textarea
            value={bio}
            maxLength={BIO_LIMIT}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full bg-transparent border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 outline-none rounded-lg px-3 py-2 text-sm resize-none transition"
          />
          <Hint>
            {bio.length} / {BIO_LIMIT}
          </Hint>
        </Row>

        <Row label="Пол">
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full bg-transparent dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 outline-none rounded-lg px-3 py-2 text-sm transition cursor-pointer"
          >
            <option>Не указан</option>
            <option>Мужской</option>
            <option>Женский</option>
            <option>Другой</option>
          </select>
          <Hint>
            Эта информация не будет включена в ваш общедоступный профиль.
          </Hint>
        </Row>

        <Row label="Рекомендации">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showSuggestions}
              onChange={(e) => setShowSuggestions(e.target.checked)}
              className="w-4 h-4 accent-blue-500 cursor-pointer"
            />
            <span className="text-sm">
              Показывать мой аккаунт в рекомендациях
            </span>
          </label>
          <Hint>
            Ваш аккаунт может появляться в рекомендациях для других людей.
          </Hint>
        </Row>

        {/* Submit */}
        <div className="flex items-center gap-4 md:pl-[140px]">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-default text-white text-sm font-semibold px-6 py-2 rounded-lg cursor-pointer transition flex items-center gap-2"
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Отправить
          </button>

          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-500 font-semibold">
              <Check className="w-4 h-4" />
              Профиль обновлён
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
      <label className="md:w-[120px] md:text-right md:pt-2 font-semibold text-sm flex-shrink-0">
        {label}
      </label>
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">{children}</div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">
      {children}
    </p>
  );
}
