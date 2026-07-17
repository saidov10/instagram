"use client";

import React, { useState } from "react";
import { api } from "../services/api";
import HashtagText from "./HashtagText";

/**
 * Renders text with an optional "See translation" affordance (section C).
 *
 * The app's UI language is Russian, so we translate to `ru` and only offer the
 * link when a lightweight client-side heuristic thinks the text isn't already
 * Russian (meaningfully more Latin than Cyrillic characters). Translation is
 * best-effort via the backend's free public API — short/slang text is unreliable,
 * so this stays an opt-in link, never an automatic swap.
 */
export default function TranslatableText({
  text,
  className,
  targetLang = "ru",
}: {
  text: string;
  className?: string;
  targetLang?: string;
}) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const cyrillic = (text.match(/[а-яё]/gi) || []).length;
  const latin = (text.match(/[a-z]/gi) || []).length;
  const looksForeign = latin > 3 && latin > cyrillic * 1.5;

  const handleToggle = async () => {
    if (showing) { setShowing(false); return; }
    if (translated) { setShowing(true); return; }
    setBusy(true);
    try {
      const res = await api.post.translateText(text, targetLang);
      const out = typeof res === "string" ? res : res?.translatedText || res?.text || res?.translation || "";
      setTranslated(out || text);
      setShowing(true);
    } catch {
      setTranslated(text);
      setShowing(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {showing && translated ? (
        <span className={className}>{translated}</span>
      ) : (
        <HashtagText text={text} className={className} />
      )}
      {looksForeign && (
        <button
          onClick={handleToggle}
          disabled={busy}
          className="block text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mt-0.5 cursor-pointer disabled:opacity-50"
        >
          {busy ? "Перевод…" : showing ? "Показать оригинал" : "Посмотреть перевод"}
        </button>
      )}
    </>
  );
}
