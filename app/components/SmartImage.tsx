"use client";

import React, { useState } from "react";
import NextImage, { ImageProps } from "next/image";
import { ImageOff } from "lucide-react";

/**
 * Drop-in replacement for `<img>` backed by `next/image`.
 *
 * Why a wrapper instead of using `next/image` directly:
 * - Most images in this app fill a CSS-sized box (`className="w-full h-full object-cover"`),
 *   so we render at a fixed intrinsic size and let the className control the real size.
 *   This behaves exactly like the old `<img>` while adding a responsive `srcset`.
 * - `blob:`/`data:` URLs (local upload previews) can't be run through the optimizer,
 *   so they're served untouched via `unoptimized`.
 * - An empty/failed `src` renders the `fallback` (or nothing) instead of throwing.
 *
 * Pass `fill` for images whose parent is `position: relative` and already sized.
 * Pass `unoptimized` for remote hosts that aren't in `next.config` `remotePatterns`
 * (e.g. third-party music cover art).
 */

type SmartImageProps = Omit<ImageProps, "src" | "width" | "height"> & {
  src?: string | null;
  /** Intrinsic size used only to build the srcset; CSS still controls the rendered size. */
  width?: number;
  height?: number;
  /** Rendered when there is no usable src or the image fails to load. */
  fallback?: React.ReactNode;
};

// Reasonable default intrinsic size for full-bleed media. The visible size is
// always dictated by className/CSS, so this only affects srcset candidates.
const DEFAULT_DIMENSION = 1080;

function isUnoptimizable(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("data:");
}

/**
 * Neutral placeholder shown when a full-bleed (`fill`) image is missing or fails
 * to load — used for post/reel/story media so a broken image reads as an empty
 * frame with an icon instead of a black void. Sized to fill its `relative` parent.
 */
function MediaPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
      <ImageOff className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
    </div>
  );
}

export default function SmartImage({
  src,
  alt = "",
  className,
  sizes,
  fill,
  width,
  height,
  unoptimized,
  onError,
  fallback,
  ...rest
}: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  const useFill = fill === true;

  const url = typeof src === "string" ? src.trim() : "";
  if (!url || failed) {
    // Fill images occupy a real frame, so default to a visible placeholder there.
    // Fixed-size images (avatars, tiny covers) default to nothing — their call
    // sites already render their own fallback.
    if (fallback !== undefined) return <>{fallback}</>;
    return useFill ? <MediaPlaceholder /> : null;
  }

  return (
    <NextImage
      src={url}
      alt={alt}
      className={className}
      // Fill needs a sizes hint; for the fixed-size fallback path we assume full width.
      sizes={sizes ?? (useFill ? "100vw" : undefined)}
      fill={useFill || undefined}
      width={useFill ? undefined : width ?? DEFAULT_DIMENSION}
      height={useFill ? undefined : height ?? DEFAULT_DIMENSION}
      unoptimized={unoptimized || isUnoptimizable(url)}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
      {...rest}
    />
  );
}
