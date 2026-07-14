"use client";

import React, { useState } from "react";
import {
  Heart,
  MessageCircle,
  X,
  Send,
  Bookmark,
  Smile,
  Search
} from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useApp } from "../context/AppContext";

interface ExploreItem {
  id: number;
  image: string;
  likes: number;
  commentsCount: number;
  spanClass?: string;
  username: string;
  avatar: string;
  location: string;
  caption: string;
  comments: { username: string; text: string }[];
}

export default function ExplorePage() {
  const { currentUser } = useSelector((state: RootState) => state.auth);
  const [selectedItem, setSelectedItem] = useState<ExploreItem | null>(null);
  const [newComment, setNewComment] = useState("");

  const [items, setItems] = useState<ExploreItem[]>([
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&h=600&fit=crop",
      likes: 312,
      commentsCount: 24,
      username: "forest_wanderer",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      location: "Redwood National Park",
      caption: "Lost in the tall trees. There's nothing like breathing in clean, fresh forest air. #nature #forest",
      comments: [
        { username: "hiking_harry", text: "Stunning shot! Adding this trail to my list." },
        { username: "nature_lover_99", text: "Wow, look at those light rays shining through!" }
      ]
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=600&fit=crop",
      likes: 541,
      commentsCount: 45,
      username: "cloud_chaser",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      location: "Mount Rainier",
      caption: "Catching the first light above the clouds. Hard hike, but totally worth it. #hiking #mountains",
      comments: [
        { username: "alpine_pro", text: "Incredible altitude capture!" }
      ]
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&h=1200&fit=crop",
      likes: 1202,
      commentsCount: 104,
      spanClass: "md:row-span-2 md:col-span-2",
      username: "canyon_jumper",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      location: "Yosemite Valley",
      caption: "Standing at the edge of the world. Yosemite continues to blow my mind every single visit. Yosemite falls is flowing full force! #climbing #optoutside",
      comments: [
        { username: "national_parks_fan", text: "El Capitan looking glorious as ever!" },
        { username: "extreme_sports", text: "Are you rope climbing or free soloing there? Scary!" },
        { username: "jessica_travels", text: "I was there last week! Gorgeous views." }
      ]
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&h=600&fit=crop",
      likes: 423,
      commentsCount: 18,
      username: "chef_special",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      location: "Naples, Italy",
      caption: "Woodfired Neapolitan pizza, baked to perfection in 60 seconds flat. Simple ingredients, extraordinary taste. #pizza #foodie #italy",
      comments: [
        { username: "pizza_connoisseur", text: "Leopard spots look perfect on that crust!" }
      ]
    },
    {
      id: 5,
      image: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&h=600&fit=crop",
      likes: 622,
      commentsCount: 39,
      username: "bridge_watcher",
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop",
      location: "Kyoto, Japan",
      caption: "A peaceful walk through the bamboo forests of Arashiyama. The rustle of leaves is nature's symphony. #kyoto #japan #travel",
      comments: [
        { username: "travel_blogger", text: "I love the sound of the wind here." }
      ]
    },
    {
      id: 6,
      image: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&h=600&fit=crop",
      likes: 832,
      commentsCount: 55,
      username: "setup_geek",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop",
      location: "Silicon Valley",
      caption: "Late night coding sessions. Dark mode on, music playing, coffee refilled. Let's build! #developer #workspace",
      comments: [
        { username: "bug_hunter", text: "Nice minimalist mechanical keyboard setup!" }
      ]
    },
    {
      id: 7,
      image: "https://images.unsplash.com/photo-1472214222541-d510753a8707?w=600&h=600&fit=crop",
      likes: 911,
      commentsCount: 72,
      username: "lake_life",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
      location: "Lake Como, Italy",
      caption: "Sunset boat rides along the shores of Lake Como. Absolute heaven on earth. #lakecomo #italy",
      comments: [
        { username: "george_c", text: "Beautiful, neighbor!" }
      ]
    },
    {
      id: 8,
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=1200&fit=crop",
      likes: 2405,
      commentsCount: 211,
      spanClass: "md:row-span-2 md:col-span-2",
      username: "space_hacker",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
      location: "Deep Space Observatory",
      caption: "Captured the heart of the Andromeda Galaxy after 48 hours of exposure stack. Zoom in to see billions of stars. #astronomy #space #nebula",
      comments: [
        { username: "nasa_engineer", text: "Amazing processing work here." },
        { username: "space_nerd", text: "This is mind bogglingly beautiful." },
        { username: "interstellar_traveler", text: "Can't wait until we can visit!" }
      ]
    },
    {
      id: 9,
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
      likes: 562,
      commentsCount: 31,
      username: "sneaker_head",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
      location: "Sneaker Drop, Berlin",
      caption: "Copped the latest retro release. Red on white classic. What's your daily sneaker choice? #sneakers #retro",
      comments: [
        { username: "hypebeast", text: "Big W! Those are clean." }
      ]
    },
    {
      id: 10,
      image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&h=600&fit=crop",
      likes: 681,
      commentsCount: 40,
      username: "gadget_guy",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
      location: "Tech Expo 2026",
      caption: "Checking out the latest transparent display prototypes. The future of screens is looking wild! #futuretech #expo",
      comments: [
        { username: "future_tech", text: "Shut up and take my money!" }
      ]
    }
  ]);

  const handleLikeModal = (id: number) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const isLiked = selectedItem?.likes === item.likes; // Simple toggle
          const updatedLikes = isLiked ? item.likes + 1 : item.likes - 1;
          const updated = { ...item, likes: updatedLikes };
          if (selectedItem?.id === id) {
            setSelectedItem(updated);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleAddCommentModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !newComment.trim()) return;

    const newCommentObj = {
      username: currentUser?.username || "user",
      text: newComment.trim()
    };

    const updatedItem = {
      ...selectedItem,
      commentsCount: selectedItem.commentsCount + 1,
      comments: [...selectedItem.comments, newCommentObj]
    };

    setItems((prevItems) =>
      prevItems.map((item) => (item.id === selectedItem.id ? updatedItem : item))
    );

    setSelectedItem(updatedItem);
    setNewComment("");
  };

  return (
    <div className="w-full max-w-[975px] mx-auto px-4 py-4 md:py-8 flex flex-col gap-6">
      
      {/* Mobile Search Bar */}
      <div className="md:hidden relative flex items-center">
        <Search className="absolute left-3 w-4.5 h-4.5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search"
          className="w-full bg-zinc-100 dark:bg-zinc-900 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 outline-none rounded-lg pl-10 pr-4 py-2 text-sm"
        />
      </div>

      {/* Explore Grid */}
      <div className="grid grid-cols-3 gap-1 md:gap-7 auto-rows-[120px] sm:auto-rows-[180px] md:auto-rows-[290px]">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedItem(item)}
            className={`group relative overflow-hidden bg-zinc-100 dark:bg-zinc-900 rounded-sm cursor-pointer ${
              item.spanClass || ""
            }`}
          >
            {/* Image */}
            <img
              src={item.image}
              alt="Explore post"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-6 text-white font-semibold transition duration-200">
              <span className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition">
                <Heart className="w-6 h-6 fill-white text-white" />
                {item.likes}
              </span>
              <span className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition">
                <MessageCircle className="w-6 h-6 fill-white text-white" />
                {item.commentsCount}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ----------------- POST DETAILS MODAL ----------------- */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          
          {/* Close button */}
          <button
            onClick={() => setSelectedItem(null)}
            className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2 z-55"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Modal Container */}
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg md:max-w-5xl rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[85vh] transition-all border border-zinc-200 dark:border-zinc-800">
            
            {/* Left Pane - Media preview */}
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={selectedItem.image}
                alt="Post Media"
                className="w-full h-full max-h-[40vh] md:max-h-[75vh] object-contain select-none"
                onDoubleClick={() => handleLikeModal(selectedItem.id)}
              />
            </div>

            {/* Right Pane - Comments Sidebar */}
            <div className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900 h-[45vh] md:h-auto">
              
              {/* Header: User info */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedItem.avatar}
                    alt={selectedItem.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm hover:underline cursor-pointer">{selectedItem.username}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{selectedItem.location}</span>
                  </div>
                </div>
                <button className="text-xs font-semibold text-blue-500 hover:text-blue-600">Follow</button>
              </div>

              {/* Comments Scroll Pane */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Caption as first comment */}
                <div className="flex gap-3">
                  <img
                    src={selectedItem.avatar}
                    alt={selectedItem.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="text-sm">
                    <span className="font-bold mr-2 hover:underline cursor-pointer">{selectedItem.username}</span>
                    <span className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{selectedItem.caption}</span>
                  </div>
                </div>

                {/* User comments list */}
                {selectedItem.comments.map((comment, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center text-xs font-bold font-mono text-zinc-650 dark:text-zinc-400 select-none uppercase">
                      {comment.username.slice(0, 2)}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold mr-2 hover:underline cursor-pointer">{comment.username}</span>
                      <span className="text-zinc-800 dark:text-zinc-200">{comment.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action area */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-4">
                    <button onClick={() => handleLikeModal(selectedItem.id)}>
                      <Heart className="w-6 h-6 text-zinc-800 dark:text-zinc-250 hover:text-zinc-500" />
                    </button>
                    <button>
                      <MessageCircle className="w-6 h-6 text-zinc-800 dark:text-zinc-250" />
                    </button>
                    <button>
                      <Send className="w-6 h-6 text-zinc-800 dark:text-zinc-250" />
                    </button>
                  </div>
                  <button>
                    <Bookmark className="w-6 h-6 text-zinc-800 dark:text-zinc-250" />
                  </button>
                </div>
                <p className="text-sm font-bold">{selectedItem.likes.toLocaleString()} likes</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase">1 day ago</p>
              </div>

              {/* Comment Input */}
              <form
                onSubmit={handleAddCommentModal}
                className="border-t border-zinc-200 dark:border-zinc-800 p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <button type="button" className="text-zinc-750 dark:text-zinc-250 hover:text-zinc-500">
                    <Smile className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-transparent text-sm w-full outline-none placeholder-zinc-400 border-none ring-0 p-0"
                  />
                </div>
                {newComment.trim() && (
                  <button
                    type="submit"
                    className="text-blue-500 font-semibold text-sm hover:text-blue-600 px-1"
                  >
                    Post
                  </button>
                )}
              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
