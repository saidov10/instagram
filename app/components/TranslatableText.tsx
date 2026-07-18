"use client";

import React, { useState } from "react";
import { api } from "../services/api";
import HashtagText from "./HashtagText";

/** Target language for "See translation" — the viewer's device locale, falling back to Russian (the app UI language). */
function deviceLang(): string {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.split("-")[0] || "ru";
  }
  return "ru";
}

/**
 * Renders caption/comment text with a "See translation" / "See original" toggle beneath it.
 * `withEntities` keeps #hashtag linking (via HashtagText); disable it for plain contexts.
 * The backend translate endpoint is best-effort, so we tolerate several response shapes and
 * degrade to a "couldn't translate" label rather than throwing.
 */
export default function TranslatableText({
  text,
  withEntities = true,
}: {
  text: string;
  withEntities?: boolean;
}) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showing) {
      setShowing(false);
      return;
    }
    if (translated != null) {
      setShowing(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.post.translateText(text, deviceLang());
      const t =
        typeof res === "string"
          ? res
          : res?.translatedText || res?.translation || res?.text || res?.data?.translatedText || res?.data;
      if (t && typeof t === "string" && t.trim()) {
        setTranslated(t);
        setShowing(true);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const body = showing && translated != null ? translated : text;

  return (
    <>
      {withEntities ? <HashtagText text={body} /> : body}
      {text.trim().length > 0 && (
        <button
          onClick={toggle}
          disabled={loading}
          className="block mt-0.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer disabled:opacity-60"
        >
          {loading ? "Перевод…" : failed ? "Не удалось перевести" : showing ? "Показать оригинал" : "Посмотреть перевод"}
        </button>
      )}
    </>
  );
}
