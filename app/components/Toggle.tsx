"use client";

import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}

/**
 * Instagram-style switch. The knob slides via an *arbitrary* translate value
 * (`translate-x-[22px]`) which always generates in Tailwind v4 — unlike the old
 * `translate-x-5.5`, whose fractional step isn't part of the spacing scale, so the
 * knob jumped past the track and looked detached. Track 44×24, knob 20, 2px inset.
 */
export default function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex items-center w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-default ${
        checked ? "bg-[var(--accent-blue)]" : "bg-zinc-300 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}
