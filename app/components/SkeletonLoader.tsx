"use client";

import React from "react";

// Stories loading list skeleton
export function StoriesSkeleton() {
  return (
    <div className="flex gap-4 py-2 overflow-x-auto no-scrollbar w-full select-none">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="w-[66px] h-[66px] rounded-full shimmer" />
          <div className="w-12 h-2.5 rounded-full shimmer" />
        </div>
      ))}
    </div>
  );
}

// Single Feed Post card skeleton
export function PostSkeleton() {
  return (
    <div className="card rounded-2xl md:rounded-3xl overflow-hidden flex flex-col w-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full shimmer" />
          <div className="flex flex-col gap-1.5">
            <div className="w-24 h-3 rounded-full shimmer" />
            <div className="w-16 h-2 rounded-full shimmer" />
          </div>
        </div>
        <div className="w-6 h-2 rounded-full shimmer" />
      </div>

      {/* Image Area */}
      <div className="aspect-square w-full shimmer" />

      {/* Action Row */}
      <div className="flex justify-between items-center px-4 py-3.5">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-full shimmer" />
          <div className="w-6 h-6 rounded-full shimmer" />
          <div className="w-6 h-6 rounded-full shimmer" />
        </div>
        <div className="w-6 h-6 rounded-full shimmer" />
      </div>

      {/* Details */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        <div className="w-20 h-3.5 rounded-full shimmer" />
        <div className="w-full h-3 rounded-full shimmer" />
        <div className="w-3/4 h-3 rounded-full shimmer" />
      </div>
    </div>
  );
}

// Profile statistics and Grid skeleton
export function ProfileSkeleton() {
  return (
    <div className="max-w-[935px] mx-auto px-4 py-6 md:py-8 w-full select-none">
      {/* Profile Header */}
      <div className="flex gap-6 md:gap-12 items-center mb-8 md:mb-12">
        <div className="w-20 h-20 md:w-36 md:h-36 rounded-full shimmer" />
        <div className="flex-1 flex flex-col gap-3">
          <div className="h-6 w-1/3 shimmer rounded-full" />
          <div className="flex gap-4 md:gap-10">
            <div className="h-4 w-12 shimmer rounded-full" />
            <div className="h-4 w-12 shimmer rounded-full" />
            <div className="h-4 w-12 shimmer rounded-full" />
          </div>
          <div className="h-4 w-2/3 shimmer rounded-full" />
        </div>
      </div>

      {/* Grid tab selector */}
      <div className="border-t border-[var(--border)] flex justify-center gap-12 py-3 mb-4">
        <div className="h-3 w-16 shimmer rounded-full" />
        <div className="h-3 w-16 shimmer rounded-full" />
      </div>

      {/* Profile Posts Grid */}
      <div className="grid grid-cols-3 gap-1 md:gap-7">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="aspect-square shimmer rounded-xl md:rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// Chat Thread Rows List skeleton
export function ChatsListSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 select-none">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-4.5 p-1">
          <div className="w-14 h-14 rounded-full shimmer flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div className="w-1/3 h-3 shimmer rounded-full" />
            <div className="w-2/3 h-2.5 shimmer rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
