"use client";

import React, { useState } from "react";
import SmartImage from "./SmartImage";

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  alt?: string;
}

/** Avatar that falls back to a generic person-silhouette icon when there's no photo or it fails to load. */
export default function Avatar({ src, name, className = "w-10 h-10", alt }: AvatarProps) {
  // Remember which URL failed rather than a bare flag, so a new `src` retries without an effect.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isDefaultAvatar = !!src && /default-avatar/i.test(src);
  const hasSrc = !!src && src !== failedSrc && !isDefaultAvatar;

  if (hasSrc) {
    return (
      <SmartImage
        src={src as string}
        alt={alt || name || "avatar"}
        onError={() => setFailedSrc(src as string)}
        width={96}
        height={96}
        sizes="96px"
        className={`${className} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${className} rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden bg-zinc-200 dark:bg-zinc-700 select-none`}
      title={alt || name}
    >
      <svg viewBox="0 0 24 24" className="w-[72%] h-[72%] text-zinc-450 dark:text-zinc-400" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.418 3.582-7 8-7s8 2.582 8 7v1H4v-1z" />
      </svg>
    </div>
  );
}
