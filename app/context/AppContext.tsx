"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Comment {
  username: string;
  text: string;
}

export interface Post {
  id: number;
  username: string;
  avatar: string;
  location: string;
  image: string;
  caption: string;
  likes: number;
  time: string;
  isLiked: boolean;
  isSaved: boolean;
  comments: Comment[];
}

interface User {
  username: string;
  name: string;
  avatar: string;
}

interface AppContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  isCreateOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  currentUser: User;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  addPost: (image: string, caption: string, location?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Default to false so user sees login screen first

  const currentUser: User = {
    username: "saaidov.7",
    name: "Мардин Саидов",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
  };

  const [posts, setPosts] = useState<Post[]>([
    {
      id: 1,
      username: "traveler_joe",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      location: "Swiss Alps, Switzerland",
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=800&fit=crop",
      caption: "Morning views from the cabin. Unbelievable feeling being surrounded by these peaks! #switzerland #travel #nature",
      likes: 1243,
      time: "2 hours ago",
      isLiked: false,
      isSaved: false,
      comments: [
        { username: "nature_explorer", text: "Wow, this looks absolutely breath-taking!" },
        { username: "alice_wonder", text: "Adding this to my bucket list immediately!" }
      ]
    },
    {
      id: 2,
      username: "foodie_chef",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      location: "Tokyo, Japan",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=800&fit=crop",
      caption: "Crafting the perfect bowl of Tonkotsu Ramen. The broth took 16 hours, but it was worth every second! #tokyo #ramen #foodporn",
      likes: 890,
      time: "5 hours ago",
      isLiked: false,
      isSaved: false,
      comments: [
        { username: "yummy_tummy", text: "OMG please share the recipe, that looks amazing!!" },
        { username: "tokyo_eats", text: "Best ramen in town, hands down." }
      ]
    },
    {
      id: 3,
      username: "creative_mind",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      location: "Design Studio, New York",
      image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&h=800&fit=crop",
      caption: "Experimenting with acrylic painting today. Let the colors take over. #art #painting #studio #nycartist",
      likes: 412,
      time: "1 day ago",
      isLiked: false,
      isSaved: false,
      comments: [
        { username: "gallery_owner", text: "We need this in our upcoming exhibition." },
        { username: "brush_strokes", text: "Love the texture on the canvas!" }
      ]
    }
  ]);

  const addPost = (image: string, caption: string, location = "Dushanbe, Tajikistan") => {
    const newPostObj: Post = {
      id: Date.now(),
      username: currentUser.username,
      avatar: currentUser.avatar,
      location,
      image,
      caption,
      likes: 0,
      time: "1s",
      isLiked: false,
      isSaved: false,
      comments: []
    };
    setPosts((prev) => [newPostObj, ...prev]);
  };

  useEffect(() => {
    // Apply class for Tailwind dark mode
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
        isLoggedIn,
        setIsLoggedIn,
        currentUser,
        posts,
        setPosts,
        addPost
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
