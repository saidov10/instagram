"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface AppContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  isCreateOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  createType: "post" | "story" | "reel";
  setCreateType: (type: "post" | "story" | "reel") => void;
  remixTarget: RemixTarget | null;
  setRemixTarget: (target: RemixTarget | null) => void;
}

export interface RemixTarget {
  postId: number;
  username: string;
  audio?: { id: string; title: string; artist: string; audioUrl: string; coverUrl?: string; durationMs?: number } | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"post" | "story" | "reel">("post");
  const [remixTarget, setRemixTarget] = useState<RemixTarget | null>(null);

  // Apply class for Tailwind dark mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        isCreateOpen,
        setCreateOpen,
        createType,
        setCreateType,
        remixTarget,
        setRemixTarget,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
