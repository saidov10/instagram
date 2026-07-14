"use client";

import React from "react";

// Stories loading list skeleton
export function StoriesSkeleton() {
  return (
    <div className="flex gap-4 py-2 overflow-x-auto no-scrollbar w-full select-none">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1.5 flex-shrink-0 animate-pulse">
          <div className="w-[66px] h-[66px] rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center p-[2.5px]">
            <div className="w-full h-full rounded-full bg-zinc-300 dark:bg-zinc-900 border border-white dark:border-black" />
          </div>
          <div className="w-12 h-2.5 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

// Single Feed Post card skeleton
export function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 md:rounded-xl overflow-hidden flex flex-col w-full animate-pulse select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex flex-col gap-1.5">
            <div className="w-24 h-3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="w-16 h-2 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        </div>
        <div className="w-5 h-2 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Image Area */}
      <div className="aspect-square w-full bg-zinc-200 dark:bg-zinc-900" />

      {/* Action Row */}
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="w-5 h-6 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>

      {/* Details */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <div className="w-20 h-3.5 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="w-full h-3 rounded bg-zinc-150 dark:bg-zinc-850" />
        <div className="w-3/4 h-3 rounded bg-zinc-150 dark:bg-zinc-850" />
      </div>
    </div>
  );
}

// Profile statistics and Grid skeleton
export function ProfileSkeleton() {
  return (
    <div className="max-w-[935px] mx-auto px-4 py-6 md:py-8 w-full animate-pulse select-none">
      {/* Profile Header */}
      <div className="flex gap-6 md:gap-12 items-center mb-8 md:mb-12">
        <div className="w-20 h-20 md:w-36 md:h-36 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 flex flex-col gap-3">
          <div className="h-6 w-1/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="flex gap-4 md:gap-10">
            <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
          <div className="h-4 w-2/3 bg-zinc-100 dark:bg-zinc-900 rounded" />
        </div>
      </div>

      {/* Grid tab selector */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 flex justify-center gap-12 py-3 mb-4">
        <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>

      {/* Profile Posts Grid */}
      <div className="grid grid-cols-3 gap-1 md:gap-7">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="aspect-square bg-zinc-200 dark:bg-zinc-900 rounded" />
        ))}
      </div>
    </div>
  );
}

// Chat Thread Rows List skeleton
export function ChatsListSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 animate-pulse select-none">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-4.5 p-1">
          <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="w-1/3 h-3 bg-zinc-250 dark:bg-zinc-800 rounded" />
            <div className="w-2/3 h-2.5 bg-zinc-150 dark:bg-zinc-850 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
