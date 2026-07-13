"use client";

import React, { useState } from "react";
import {
  Grid,
  Film,
  Bookmark,
  UserCheck,
  Heart,
  MessageCircle,
  Settings,
  Plus,
  X,
  Send,
  Smile
} from "lucide-react";
import { useApp, Post, Comment } from "../context/AppContext";

export default function ProfilePage() {
  const { currentUser, posts, setPosts, setCreateOpen } = useApp();
  
  // Filter current user's posts
  const userPosts = posts.filter((p) => p.username === currentUser.username);
  
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "saved" | "tagged">("posts");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState("");

  // Modal lists
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [showFollowingList, setShowFollowingList] = useState(false);
  
  // Follow list mock data
  const [followers, setFollowers] = useState([
    { id: 1, username: "traveler_joe", name: "Joe Thompson", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", following: true },
    { id: 2, username: "foodie_chef", name: "Sarah Jenkins", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", following: true },
    { id: 3, username: "nature_pics", name: "Marc Peterson", avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop", following: false },
    { id: 4, username: "fitness_trainer", name: "Chris Evans", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop", following: true }
  ]);

  const [following, setFollowing] = useState([
    { id: 1, username: "traveler_joe", name: "Joe Thompson", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", following: true },
    { id: 2, username: "foodie_chef", name: "Sarah Jenkins", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", following: true },
    { id: 4, username: "fitness_trainer", name: "Chris Evans", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop", following: true }
  ]);

  const highlights = [
    { label: ".", cover: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" },
    { label: ".", cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&h=100&fit=crop" }
  ];

  const handleLikePostDetail = (id: number) => {
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === id) {
          const isLiked = selectedPost?.likes === p.likes;
          const updatedLikes = isLiked ? p.likes + 1 : p.likes - 1;
          const updated = { ...p, likes: updatedLikes };
          if (selectedPost?.id === id) {
            setSelectedPost(updated);
          }
          return updated;
        }
        return p;
      })
    );
  };

  const handleAddCommentDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newComment.trim()) return;

    const newCommentObj = {
      username: currentUser.username,
      text: newComment.trim()
    };
    const updatedPost: Post = {
      ...selectedPost,
      comments: [...selectedPost.comments, newCommentObj]
    };

    setPosts((prevPosts) =>
      prevPosts.map((p) => (p.id === selectedPost.id ? updatedPost : p))
    );

    setSelectedPost(updatedPost);
    setNewComment("");
  };

  const handleFollowToggle = (id: number, type: "followers" | "following") => {
    if (type === "followers") {
      setFollowers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, following: !user.following } : user))
      );
    } else {
      setFollowing((prev) =>
        prev.map((user) => (user.id === id ? { ...user, following: !user.following } : user))
      );
    }
  };

  return (
    <div className="w-full max-w-[935px] mx-auto px-4 py-8 flex flex-col gap-10">
      
      {/* ----------------- PROFILE HEADER ----------------- */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-24 border-b border-zinc-200 dark:border-zinc-800 pb-10">
        {/* Profile Picture */}
        <div className="relative w-36 h-36 flex-shrink-0 cursor-pointer group">
          <div className="w-full h-full rounded-full p-[3px] bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600">
            <div className="bg-white dark:bg-black p-1 rounded-full w-full h-full">
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-full h-full rounded-full object-cover border border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>
        </div>

        {/* User Info Column */}
        <div className="flex-1 flex flex-col gap-5 w-full text-left">
          {/* Row 1: Username & Settings */}
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-normal flex items-center gap-1.5">
              {currentUser.username}
            </h2>
            <div className="flex gap-2 text-sm font-semibold select-none">
              <button className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-205 dark:hover:bg-zinc-700 active:opacity-80 px-4 py-1.5 rounded-lg transition cursor-pointer">
                Редактировать профиль
              </button>
              <button className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-205 dark:hover:bg-zinc-700 active:opacity-80 px-4 py-1.5 rounded-lg transition text-center cursor-pointer">
                Посмотреть архив
              </button>
            </div>
            <button className="p-1 hover:text-zinc-500 cursor-pointer">
              <Settings className="w-6 h-6 stroke-[1.5px]" />
            </button>
          </div>

          {/* Row 2: Metrics */}
          <div className="flex gap-8 text-sm md:text-base select-none">
            <span>
              <strong className="font-semibold">{userPosts.length}</strong> публикаций
            </span>
            <button onClick={() => setShowFollowersList(true)} className="hover:opacity-75 transition cursor-pointer">
              <strong className="font-semibold">1 273</strong> подписчиков
            </button>
            <button onClick={() => setShowFollowingList(true)} className="hover:opacity-75 transition cursor-pointer">
              <strong className="font-semibold">380</strong> подписок
            </button>
          </div>

          {/* Row 3: Username Link with Threads logo */}
          <div className="text-sm font-normal text-zinc-900 dark:text-zinc-200">
            <span className="font-semibold select-all">Мардин Саидов</span>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.8 1.6C7.2 1.6 2.4 5.9 1.6 11.2c-.4 2.8 0 5.6 1.2 8 1.6 2.8 4 4.8 7.2 5.2 2.8.4 5.6-.4 8-1.6l-1.2-2c-1.6.8-3.6 1.2-5.6 1-2.4-.4-4.4-1.6-5.6-3.6-.8-1.6-1.2-3.6-1-5.6C5.2 7.6 9 4 12.8 4c3.2 0 6 2 7.2 4.8.8 2 1 4 .4 6-.8 2-2.4 3.2-4.4 3.2-1.2 0-2-.4-2.4-1.2-.4-.8-.4-1.6-.4-2.4V12c0-2-1.6-3.6-3.6-3.6s-3.6 1.6-3.6 3.6 1.6 3.6 3.6 3.6c1.2 0 2-.4 2.4-1.2.4.4.8.8 1.6.8 2.8 0 5.2-2 6-4.8.8-2.8.4-5.6-.8-8C20 3.6 16.4 1.6 12.8 1.6zm-3.2 10.4c0-1.2.8-2 2-2s2 .8 2 2-.8 2-2 2-2-.8-2-2z"/>
              </svg>
              <a href="#" className="hover:underline">@{currentUser.username}</a>
            </div>
          </div>
        </div>
      </header>

      {/* ----------------- HIGHLIGHTS SECTION ----------------- */}
      <section className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth pb-4 border-b border-zinc-200 dark:border-zinc-800">
        {highlights.map((hl, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 p-0.5 border border-zinc-200 dark:border-zinc-800 group-hover:scale-103 transition">
              <img
                src={hl.cover}
                alt={hl.label}
                className="w-full h-full rounded-full object-cover group-hover:scale-105 transition duration-200"
              />
            </div>
            <span className="text-xs text-zinc-650 dark:text-zinc-400 font-medium">{hl.label}</span>
          </div>
        ))}
        {/* Add Highlight */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
          <div className="w-16 h-16 rounded-full border border-dashed border-zinc-350 dark:border-zinc-700 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 group-hover:scale-103 transition">
            <Plus className="w-6 h-6 text-zinc-450 dark:text-zinc-655" />
          </div>
          <span className="text-xs text-zinc-450 dark:text-zinc-600 font-medium">Добавить</span>
        </div>
      </section>

      {/* ----------------- TABS SECTION ----------------- */}
      <div className="flex flex-col gap-6">
        {/* Tab Headers (Icons only, centered) */}
        <div className="flex justify-center border-t border-zinc-200 dark:border-zinc-800 pt-0 gap-16 text-zinc-400 select-none">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
              activeTab === "posts"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab("reels")}
            className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
              activeTab === "reels"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Film className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
              activeTab === "saved"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Bookmark className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab("tagged")}
            className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
              activeTab === "tagged"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <UserCheck className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Grid Contents */}
        {activeTab === "posts" && (
          userPosts.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 md:gap-7">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="group relative aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-sm overflow-hidden cursor-pointer"
                >
                  <img src={post.image} alt="Profile Post" className="w-full h-full object-cover transition duration-300 group-hover:scale-101" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-6 text-white font-semibold transition duration-200">
                    <span className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition">
                      <Heart className="w-6 h-6 fill-white text-white" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition">
                      <MessageCircle className="w-6 h-6 fill-white text-white" />
                      {post.comments.length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state matching user screenshot */
            <div className="flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full border border-black dark:border-white flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-black dark:text-white fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
              <h3 className="text-3xl font-extrabold mb-3 tracking-tight text-zinc-900 dark:text-white animate-in zoom-in duration-300">Поделиться фото</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-6 leading-relaxed">
                Фото, которыми вы делитесь, будут показываться в вашем профиле.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="text-blue-500 font-bold text-sm hover:text-blue-600 cursor-pointer transition"
              >
                Поделитесь своим первым фото
              </button>
            </div>
          )
        )}

        {activeTab === "reels" && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 select-none">
            <Film className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-4 stroke-[1.2px]" />
            <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Здесь будут ваши видео Reels</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
              Публикуйте короткие развлекательные ролики и делитесь ими с друзьями.
            </p>
          </div>
        )}

        {activeTab === "saved" && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 select-none">
            <Bookmark className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-4 stroke-[1.2px]" />
            <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Сохранить</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
              Сохраняйте фото и видео, чтобы посмотреть их позже. Никто не узнает о том, что вы сохранили.
            </p>
          </div>
        )}

        {activeTab === "tagged" && (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 select-none">
            <UserCheck className="w-12 h-12 text-zinc-400 dark:text-zinc-600 mb-4 stroke-[1.2px]" />
            <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">Фото с вами</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
              Здесь будут показываться публикации, на которых вас отметили друзья.
            </p>
          </div>
        )}
      </div>

      {/* ----------------- POST DETAILS MODAL ----------------- */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <button
            onClick={() => setSelectedPost(null)}
            className="absolute top-4 right-4 text-white hover:text-zinc-300 p-2 z-55"
          >
            <X className="w-8 h-8" />
          </button>

          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg md:max-w-5xl rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[85vh] transition-all border border-zinc-200 dark:border-zinc-800">
            {/* Left Image View */}
            <div className="flex-1 bg-zinc-55 dark:bg-zinc-950 flex items-center justify-center p-2 min-h-[300px]">
              <img
                src={selectedPost.image}
                alt="Post Media"
                className="w-full h-full max-h-[40vh] md:max-h-[75vh] object-contain select-none"
                onDoubleClick={() => handleLikePostDetail(selectedPost.id)}
              />
            </div>

            {/* Right Comments Column */}
            <div className="w-full md:w-[400px] border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900 h-[45vh] md:h-auto animate-in slide-in-from-left duration-205">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm hover:underline cursor-pointer">{currentUser.username}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{selectedPost.location}</span>
                  </div>
                </div>
                <button className="text-zinc-800 dark:text-zinc-200 hover:text-zinc-500">
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              {/* Comments scroll */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {/* Caption first */}
                <div className="flex gap-3">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="text-sm">
                    <span className="font-bold mr-2 hover:underline cursor-pointer">{currentUser.username}</span>
                    <span className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{selectedPost.caption}</span>
                  </div>
                </div>

                {/* Comments list */}
                {selectedPost.comments.map((comment, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-850 flex-shrink-0 flex items-center justify-center text-xs font-bold font-mono text-zinc-650 dark:text-zinc-405 select-none uppercase">
                      {comment.username.slice(0, 2)}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold mr-2 hover:underline cursor-pointer">{comment.username}</span>
                      <span className="text-zinc-800 dark:text-zinc-200">{comment.text}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex gap-4">
                    <button onClick={() => handleLikePostDetail(selectedPost.id)}>
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
                <p className="text-sm font-bold">{selectedPost.likes.toLocaleString()} likes</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase text-left">2 days ago</p>
              </div>

              {/* Comment Input */}
              <form
                onSubmit={handleAddCommentDetail}
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

      {/* ----------------- FOLLOWERS MODAL LIST ----------------- */}
      {showFollowersList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-base flex-1 text-center">Followers</span>
              <button onClick={() => setShowFollowersList(false)} className="text-zinc-800 dark:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-h-[350px]">
              {followers.map((fUser) => (
                <div key={fUser.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={fUser.avatar} alt={fUser.username} className="w-9 h-9 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold hover:underline cursor-pointer">{fUser.username}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{fUser.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFollowToggle(fUser.id, "followers")}
                    className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition ${
                      fUser.following
                        ? "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-705 text-zinc-800 dark:text-zinc-200"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {fUser.following ? "Following" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- FOLLOWING MODAL LIST ----------------- */}
      {showFollowingList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-base flex-1 text-center">Following</span>
              <button onClick={() => setShowFollowingList(false)} className="text-zinc-800 dark:text-zinc-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 max-h-[350px]">
              {following.map((fUser) => (
                <div key={fUser.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={fUser.avatar} alt={fUser.username} className="w-9 h-9 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold hover:underline cursor-pointer">{fUser.username}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{fUser.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFollowToggle(fUser.id, "following")}
                    className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition ${
                      fUser.following
                        ? "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-705 text-zinc-800 dark:text-zinc-200"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {fUser.following ? "Following" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
