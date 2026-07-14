"use client";

import React from "react";
import Link from "next/link";

/** Matches #tag with unicode letters, so Cyrillic hashtags (#реакт) work too. */
const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;

interface HashtagTextProps {
  text?: string | null;
  className?: string;
  /** Extra classes for the hashtag links (colour is themed by default). */
  linkClassName?: string;
}

/**
 * Renders post/reel captions with every #hashtag turned into a link to /explore/tags/[tag].
 * Plain text is passed through untouched.
 */
export default function HashtagText({ text, className = "", linkClassName = "" }: HashtagTextProps) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(HASHTAG_RE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    const tag = match[1];
    parts.push(
      <Link
        key={`${start}-${tag}`}
        href={`/explore/tags/${encodeURIComponent(tag)}`}
        onClick={(e) => e.stopPropagation()}
        className={`text-blue-500 hover:underline ${linkClassName}`}
      >
        #{tag}
      </Link>
    );
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}
