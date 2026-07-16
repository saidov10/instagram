"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface AppContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  isCreateOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  createType: "post" | "story" | "reel";
  setCreateType: (type: "post" | "story" | "reel") => void;
  remixTarget: { postId: number; username: string } | null;
  setRemixTarget: (target: { postId: number; username: string } | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"post" | "story" | "reel">("post");
  const [remixTarget, setRemixTarget] = useState<{ postId: number; username: string } | null>(null);

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
