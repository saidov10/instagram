"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Grid,
  Film,
  Bookmark,
  Heart,
  MessageCircle,
  Settings,
  Plus,
  X,
  Smile,
  Music,
  Trash2,
  Pencil,
  Clock,
  UserSquare,
  ArchiveRestore,
  ChevronLeft,
  BarChart3,
  Eye,
  TrendingUp,
  ChevronDown,
  Plus as PlusIcon,
  Check,
  Repeat2,
  MoreHorizontal
} from "lucide-react";
import { AppDispatch, RootState } from "../store/store";
import { fetchMyProfile } from "../store/slices/authSlice";
import {
  fetchMyPosts,
  fetchPostFavorites,
  fetchSavedAudios,
  fetchArchivedPosts,
  fetchTaggedPosts,
  fetchCollections,
  createCollection,
  deleteCollection,
  renameCollection,
  bulkArchivePosts,
  bulkDeletePosts,
  pinPostToProfile,
  archivePost,
  toggleLikePost,
  addPostFavorite,
  addComment,
  deletePost,
  updatePostCaption,
  togglePostComments,
  updateCommentPermission,
  toggleLikeCountVisibility,
  toggleSensitive,
  toggleAgeRestricted,
  toggleStorySharing,
  Collection,
} from "../store/slices/postsSlice";
import { fetchMyStories, viewStory, Story } from "../store/slices/storiesSlice";
import { api, getFullImageUrl } from "../services/api";
import { ProfileSkeleton } from "../components/SkeletonLoader";
import { useApp } from "../context/AppContext";
import { Bookmark as BookmarkIcon } from "lucide-react";
import Avatar from "../components/Avatar";
import { toast } from "../lib/toast";
import { confirmDialog } from "../lib/confirm";
import SmartImage from "../components/SmartImage";
import Highlights from "../components/Highlights";
import VerifiedBadge from "../components/VerifiedBadge";
import StoryViewer from "../components/StoryViewer";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { setCreateOpen, setCreateType } = useApp();
  const { currentUser, profileLoading, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const { myPosts, savedPosts, savedAudios, archivedPosts, taggedPosts, collections } = useSelector((state: RootState) => state.posts);
  const { myStories } = useSelector((state: RootState) => state.stories);
  const [activeStoryId, setActiveStoryId] = useState<number | null>(null);
  const activeStory = activeStoryId === null ? null : myStories.find((s) => s.id === activeStoryId) || null;

  useEffect(() => {
    if (isLoggedIn) dispatch(fetchMyStories());
  }, [isLoggedIn, dispatch]);

  const handleOpenOwnStory = () => {
    if (myStories.length === 0) return;
    setActiveStoryId(myStories[0].id);
  };

  const handleNavigateStory = (story: Story) => {
    setActiveStoryId(story.id);
  };

  // Saved tab: null = folder grid; "all" or a collection id = viewing that folder's posts.
  const [openCollection, setOpenCollection] = useState<"all" | number | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);

  // Tag / collaborator requests (#15/#16)
  const [tagRequests, setTagRequests] = useState<any[]>([]);
  const [collabRequests, setCollabRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  // Multi-account switcher (#23)
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [addMode, setAddMode] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [switchBusy, setSwitchBusy] = useState(false);

  const handleOpenSwitcher = () => {
    setShowSwitcher(true);
    setAddMode(false);
    api.account.getLinkedAccounts().then((l) => setLinkedAccounts(l || [])).catch(() => setLinkedAccounts([]));
  };

  const handleSwitchAccount = async (userId: string) => {
    setSwitchBusy(true);
    try {
      await api.account.switchAccount(userId);
      await dispatch(fetchMyProfile());
      setShowSwitcher(false);
      // Re-fetch this profile's data under the new session.
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch account:", err);
    } finally {
      setSwitchBusy(false);
    }
  };

  const handleAddAccount = async () => {
    if (!addUsername.trim() || !addPassword) return;
    setSwitchBusy(true);
    try {
      await api.account.addLinkedAccount(addUsername.trim(), addPassword);
      const l = await api.account.getLinkedAccounts();
      setLinkedAccounts(l || []);
      setAddMode(false);
      setAddUsername("");
      setAddPassword("");
    } catch (err) {
      console.error("Failed to add account:", err);
    } finally {
      setSwitchBusy(false);
    }
  };

  // Insights (#20) — Business/Creator accounts
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<any | null>(null);
  const isProfessional = currentUser?.accountType === "BUSINESS" || currentUser?.accountType === "CREATOR";

  const handleOpenInsights = async () => {
    setShowInsights(true);
    try {
      const data = await api.profile.getInsights();
      setInsights(data);
    } catch (err) {
      console.error("Failed to load insights:", err);
    }
  };

  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "reposts" | "saved" | "audios" | "tagged" | "archived">("posts");
  const [showMoreTabsMenu, setShowMoreTabsMenu] = useState(false);
  // The backend can hand out duplicate post ids, so we select by (list + index)
  // instead of by id — otherwise `find(by id)` always resolves to the first match
  // and every grid thumbnail would open the same post. Index-based selection is also
  // re-read from the store each render, so likes/comments stay fresh.
  const [selected, setSelected] = useState<{ source: "my" | "saved" | "tagged"; index: number } | null>(null);
  const [newComment, setNewComment] = useState("");

  // Modal lists
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [showFollowingList, setShowFollowingList] = useState(false);

  // Follow list dynamic states
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [removingFollowerId, setRemovingFollowerId] = useState<string | null>(null);

  // Multi-select mode on the "posts" grid (#5 bulk archive/delete)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const handleTogglePostSelect = (postId: number) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleExitSelectMode = () => {
    setSelectMode(false);
    setSelectedPostIds(new Set());
  };

  const handleBulkArchive = async () => {
    if (selectedPostIds.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    try {
      await dispatch(bulkArchivePosts({ postIds: Array.from(selectedPostIds), isArchived: true })).unwrap();
      handleExitSelectMode();
    } catch (err) {
      console.error("Failed to bulk-archive:", err);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPostIds.size === 0 || bulkBusy) return;
    if (!(await confirmDialog({ message: `Удалить ${selectedPostIds.size} публикаций? Это действие необратимо.`, confirmText: "Удалить", destructive: true }))) return;
    setBulkBusy(true);
    try {
      await dispatch(bulkDeletePosts(Array.from(selectedPostIds))).unwrap();
      handleExitSelectMode();
    } catch (err) {
      console.error("Failed to bulk-delete:", err);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleInviteCollaborator = async (collectionId: number) => {
    const username = window.prompt("Имя пользователя для приглашения в коллекцию")?.trim().replace(/^@/, "");
    if (!username) return;
    try {
      const matches = await api.user.getUsers({ userName: username, pageSize: 5 });
      const match = matches.find((u: any) => (u.userName || u.username || "").toLowerCase() === username.toLowerCase()) || matches[0];
      if (!match) {
        toast("Пользователь не найден.", "error");
        return;
      }
      await api.user.addCollectionCollaborator(collectionId, match.id || match.userId);
      toast(`@${match.userName || match.username} добавлен(а) в коллекцию.`, "success");
    } catch (err: any) {
      toast(err?.message || "Не удалось добавить участника.", "error");
    }
  };

  const handleRemoveCollaborator = async (collectionId: number) => {
    const username = window.prompt("Имя пользователя, которого убрать из коллекции")?.trim().replace(/^@/, "");
    if (!username) return;
    try {
      const matches = await api.user.getUsers({ userName: username, pageSize: 5 });
      const match = matches.find((u: any) => (u.userName || u.username || "").toLowerCase() === username.toLowerCase()) || matches[0];
      if (!match) {
        toast("Пользователь не найден.", "error");
        return;
      }
      await api.user.removeCollectionCollaborator(collectionId, match.id || match.userId);
      toast(`@${match.userName || match.username} удалён(а) из коллекции.`, "success");
    } catch (err: any) {
      toast(err?.message || "Не удалось убрать участника.", "error");
    }
  };

  const handlePinToProfile = async (post: { id: number; isPinnedToProfile?: boolean }) => {
    try {
      await dispatch(pinPostToProfile({ postId: post.id, isPinned: !post.isPinnedToProfile })).unwrap();
    } catch (err: any) {
      toast(err?.message || "Не удалось закрепить публикацию (максимум 3).", "error");
    }
  };

  // Post settings menu inside the profile's own detail view (mirrors the home-feed 3-dot menu).
  const [showDetailMenu, setShowDetailMenu] = useState(false);
  const [editingCaptionPostId, setEditingCaptionPostId] = useState<number | null>(null);
  const [editCaptionText, setEditCaptionText] = useState("");
  const [editCaptionBusy, setEditCaptionBusy] = useState(false);
  const [detailCopied, setDetailCopied] = useState(false);

  const handleTogglePostComments = (post: { id: number; allowComments: boolean }) => {
    dispatch(togglePostComments({ postId: post.id, allowComments: !post.allowComments }));
    setShowDetailMenu(false);
  };
  const handleSetCommentPermissionDetail = (
    post: { id: number; commentPermission?: "EVERYONE" | "FOLLOWING" | "FOLLOWERS" },
    commentPermission: "EVERYONE" | "FOLLOWING" | "FOLLOWERS"
  ) => {
    if ((post.commentPermission || "EVERYONE") === commentPermission) return;
    dispatch(updateCommentPermission({ postId: post.id, commentPermission }));
  };
  const handleToggleLikeCountDetail = (post: { id: number; hideLikeCount?: boolean }) => {
    dispatch(toggleLikeCountVisibility({ postId: post.id, hideLikeCount: !post.hideLikeCount }));
    setShowDetailMenu(false);
  };
  const handleToggleSensitiveDetail = (post: { id: number; isSensitive?: boolean }) => {
    dispatch(toggleSensitive({ postId: post.id, isSensitive: !post.isSensitive }));
    setShowDetailMenu(false);
  };
  const handleToggleAgeRestrictedDetail = (post: { id: number; isAgeRestricted?: boolean }) => {
    dispatch(toggleAgeRestricted({ postId: post.id, isAgeRestricted: !post.isAgeRestricted }));
    setShowDetailMenu(false);
  };
  const handleToggleStorySharingDetail = (post: { id: number; allowStorySharing?: boolean }) => {
    dispatch(toggleStorySharing({ postId: post.id, allowStorySharing: !post.allowStorySharing }));
    setShowDetailMenu(false);
  };
  const handlePinToProfileDetail = (post: { id: number; isPinnedToProfile?: boolean }) => {
    handlePinToProfile(post);
    setShowDetailMenu(false);
  };
  const handleOpenEditCaption = (post: { id: number; caption: string }) => {
    setEditingCaptionPostId(post.id);
    setEditCaptionText(post.caption || "");
    setShowDetailMenu(false);
  };
  const handleSaveEditCaption = async () => {
    if (editingCaptionPostId === null || editCaptionBusy) return;
    setEditCaptionBusy(true);
    try {
      await dispatch(updatePostCaption({ postId: editingCaptionPostId, caption: editCaptionText.trim() })).unwrap();
      setEditingCaptionPostId(null);
    } catch (err) {
      console.error("Failed to update caption:", err);
    } finally {
      setEditCaptionBusy(false);
    }
  };
  const handleCopyDetailLink = (postId: number) => {
    navigator.clipboard?.writeText(`${window.location.origin}/p/${postId}`).catch(() => {});
    setDetailCopied(true);
    setTimeout(() => {
      setDetailCopied(false);
      setShowDetailMenu(false);
    }, 1000);
  };
  const handleShareToStoryDetail = async (postId: number) => {
    setShowDetailMenu(false);
    try {
      await api.story.sharePostToStory(postId);
    } catch (err: any) {
      toast(err?.message || "Автор отключил репост этой публикации в истории.", "error");
    }
  };

  const handleRemoveFollower = async (userId: string) => {
    if (removingFollowerId) return;
    if (!(await confirmDialog({ message: "Убрать этого подписчика?", confirmText: "Убрать", destructive: true }))) return;
    setRemovingFollowerId(userId);
    const snapshot = followers;
    setFollowers((prev) => prev.filter((f) => f.id !== userId));
    try {
      await api.following.removeFollower(userId);
    } catch (err) {
      console.error("Failed to remove follower:", err);
      setFollowers(snapshot);
    } finally {
      setRemovingFollowerId(null);
    }
  };

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      dispatch(fetchMyPosts());
      dispatch(fetchPostFavorites({}));
      dispatch(fetchSavedAudios());
      dispatch(fetchArchivedPosts());
      dispatch(fetchTaggedPosts(currentUser.id));
      dispatch(fetchCollections());
      api.post.getTagRequests().then((l) => setTagRequests(l || [])).catch(() => setTagRequests([]));
      api.post.getCollabRequests().then((l) => setCollabRequests(l || [])).catch(() => setCollabRequests([]));

      // Fetch followers & following
      const loadRelations = async () => {
        try {
          const subscribers = await api.following.getSubscribers(currentUser.id);
          setFollowers(subscribers.map((s: any) => ({
            id: s.id || s.userId,
            username: s.userName || s.username || "follower",
            name: s.name || s.fullName || "User",
            avatar: getFullImageUrl(s.avatar || s.imagePath) || "",
            following: true
          })));

          const subscriptions = await api.following.getSubscriptions(currentUser.id);
          setFollowing(subscriptions.map((s: any) => ({
            id: s.id || s.userId,
            username: s.userName || s.username || "following",
            name: s.name || s.fullName || "User",
            avatar: getFullImageUrl(s.avatar || s.imagePath) || "",
            following: true
          })));
        } catch (err) {
          console.error("Failed to load followers/following:", err);
        }
      };
      loadRelations();
    }
  }, [isLoggedIn, currentUser, dispatch]);

  const selectedList =
    selected?.source === "saved" ? savedPosts : selected?.source === "tagged" ? taggedPosts : myPosts;
  const selectedPost = selected ? selectedList[selected.index] || null : null;
  const isSelectedFromSaved = selected?.source === "saved";

  const handleUnarchive = async (postId: number) => {
    try {
      await dispatch(archivePost({ postId, isArchived: false })).unwrap();
    } catch (err) {
      console.error("Failed to unarchive post:", err);
    }
  };

  const handleTagRequest = async (postId: number, approve: boolean) => {
    try {
      if (approve) {
        await api.post.approveTag(postId);
        if (currentUser) dispatch(fetchTaggedPosts(currentUser.id));
      } else {
        await api.post.rejectTag(postId);
      }
      setTagRequests((prev) => prev.filter((r) => (r.id ?? r.postId) !== postId));
    } catch (err) {
      console.error("Failed to handle tag request:", err);
    }
  };

  const handleCollabRequest = async (postId: number, approve: boolean) => {
    try {
      if (approve) await api.post.approveCollab(postId);
      else await api.post.rejectCollab(postId);
      setCollabRequests((prev) => prev.filter((r) => (r.id ?? r.postId) !== postId));
    } catch (err) {
      console.error("Failed to handle collab request:", err);
    }
  };

  const handleOpenCollection = (target: "all" | number) => {
    setOpenCollection(target);
    dispatch(fetchPostFavorites(target === "all" ? {} : { collectionId: target }));
  };

  const handleCreateCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    try {
      await dispatch(createCollection(name)).unwrap();
      setNewCollectionName("");
      setShowNewCollection(false);
    } catch (err) {
      console.error("Failed to create collection:", err);
    }
  };

  const handleRenameCollection = async (col: { id: number; name: string }) => {
    const name = window.prompt("Новое название коллекции", col.name)?.trim();
    if (!name || name === col.name) return;
    try {
      await dispatch(renameCollection({ collectionId: col.id, name })).unwrap();
    } catch (err) {
      console.error("Failed to rename collection:", err);
    }
  };

  const handleDeleteCollection = async (collectionId: number) => {
    if (!(await confirmDialog({ message: "Удалить эту коллекцию?", confirmText: "Удалить", destructive: true }))) return;
    try {
      await dispatch(deleteCollection(collectionId)).unwrap();
      if (openCollection === collectionId) setOpenCollection(null);
    } catch (err) {
      console.error("Failed to delete collection:", err);
    }
  };

  const handleLikePostDetail = (id: number) => {
    dispatch(toggleLikePost(id));
  };

  const handleAddCommentDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newComment.trim() || !currentUser) return;

    const comment = newComment.trim();
    dispatch(addComment({ postId: selectedPost.id, comment, username: currentUser.username, userId: currentUser.id }));
    setNewComment("");
  };

  const handleUnsave = (postId: number) => {
    dispatch(addPostFavorite(postId));
    setSelected(null);
  };

  const handleArchiveFromDetail = async (postId: number) => {
    try {
      await dispatch(archivePost({ postId, isArchived: true })).unwrap();
      setSelected(null);
    } catch (err) {
      console.error("Failed to archive post:", err);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (await confirmDialog({ message: "Удалить эту публикацию?", confirmText: "Удалить", destructive: true })) {
      try {
        await dispatch(deletePost(postId)).unwrap();
        setSelected(null);
      } catch (err) {
        console.error("Failed to delete post:", err);
      }
    }
  };

  const handleFollowToggle = async (userId: string, isFollowing: boolean, username: string) => {
    try {
      if (isFollowing) {
        await api.following.unfollow(userId);
      } else {
        await api.following.follow(userId);
      }
      // Refresh relations
      if (currentUser) {
        const subscriptions = await api.following.getSubscriptions(currentUser.id);
        setFollowing(subscriptions.map((s: any) => ({
          id: s.id || s.userId,
          username: s.userName || s.username || "following",
          name: s.name || s.fullName || "User",
          avatar: getFullImageUrl(s.avatar || s.imagePath) || "",
          following: true
        })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (profileLoading || !currentUser) {
    return <ProfileSkeleton />;
  }

  // Split the mixed "posts" feed into distinct grids, like real Instagram profiles.
  const myReels = myPosts.filter((p) => p.isReel && !p.repostedFrom);
  const myReposts = myPosts.filter((p) => p.repostedFrom);
  const myPlainPosts = myPosts.filter((p) => !p.isReel && !p.repostedFrom);
  const openInLightbox = (postId: number) => {
    const index = myPosts.findIndex((p) => p.id === postId);
    if (index !== -1) setSelected({ source: "my", index });
  };

  return (
    <div className="w-full max-w-[935px] mx-auto px-4 py-8 flex flex-col gap-10 text-black dark:text-white transition-colors duration-200 animate-fade-up">
      
      {/* ----------------- PROFILE HEADER ----------------- */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-24 border-b border-zinc-200 dark:border-zinc-800 pb-10">
        {/* Profile Picture — story ring only when there's an active story; taps into the viewer. */}
        <div
          onClick={handleOpenOwnStory}
          className={`relative w-36 h-36 flex-shrink-0 group ${myStories.length > 0 ? "cursor-pointer" : ""}`}
        >
          {myStories.length > 0 ? (
            <div
              className={`w-full h-full rounded-full p-[3px] shadow-soft-md ${
                myStories.every((s) => s.viewed) ? "bg-zinc-300 dark:bg-zinc-700" : "gradient-ring animate-gradient"
              }`}
            >
              <div className="bg-background p-1 rounded-full w-full h-full">
                <Avatar src={currentUser.avatar} name={currentUser.username} className="w-full h-full border border-zinc-200 dark:border-zinc-800" />
              </div>
            </div>
          ) : (
            <Avatar src={currentUser.avatar} name={currentUser.username} className="w-full h-full border border-zinc-200 dark:border-zinc-800" />
          )}
        </div>

        {/* User Info Column */}
        <div className="flex-1 flex flex-col gap-5 w-full text-left">
          {/* Row 1: Username & Settings */}
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={handleOpenSwitcher} className="flex items-center gap-1.5 cursor-pointer group">
              <h2 className="text-xl font-normal flex items-center gap-1.5">
                {currentUser.username}
                {currentUser.isVerified && <VerifiedBadge className="w-[18px] h-[18px]" />}
              </h2>
              <ChevronDown className="w-5 h-5 text-zinc-500 group-hover:text-black dark:group-hover:text-white" />
            </button>
            {currentUser.isInQuietMode && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">🌙 В тихом режиме</span>
            )}
            <div className="flex gap-2 text-sm font-semibold select-none">
              <button
                onClick={() => router.push("/settings")}
                className="glass press px-5 py-2 rounded-xl transition cursor-pointer hover:shadow-soft"
              >
                Редактировать профиль
              </button>
            </div>
            {isProfessional && (
              <button
                onClick={handleOpenInsights}
                title="Статистика"
                className="p-1 hover:text-zinc-500 cursor-pointer"
              >
                <BarChart3 className="w-6 h-6 stroke-[1.5px]" />
              </button>
            )}
            <button
              onClick={() => setActiveTab(activeTab === "archived" ? "posts" : "archived")}
              title="Архив"
              className={`p-1 cursor-pointer ${activeTab === "archived" ? "text-black dark:text-white" : "hover:text-zinc-500"}`}
            >
              <Clock className="w-6 h-6 stroke-[1.5px]" />
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="p-1 hover:text-zinc-500 cursor-pointer"
            >
              <Settings className="w-6 h-6 stroke-[1.5px]" />
            </button>
          </div>

          {/* Row 2: Metrics */}
          <div className="flex gap-8 text-sm md:text-base select-none">
            <span>
              <strong className="font-semibold">{myPosts.length}</strong> публикаций
            </span>
            <button onClick={() => setShowFollowersList(true)} className="hover:opacity-75 transition cursor-pointer">
              <strong className="font-semibold">{followers.length}</strong> подписчиков
            </button>
            <button onClick={() => setShowFollowingList(true)} className="hover:opacity-75 transition cursor-pointer">
              <strong className="font-semibold">{following.length}</strong> подписок
            </button>
          </div>

          {/* Row 3: Bio */}
          <div className="text-sm font-normal text-zinc-900 dark:text-zinc-200">
            <span className="font-semibold block">
              {currentUser.name}
              {currentUser.pronouns && (
                <span className="font-normal text-zinc-500 dark:text-zinc-500 ml-1.5">{currentUser.pronouns}</span>
              )}
            </span>
            <p className="mt-1 text-zinc-700 dark:text-zinc-400 whitespace-pre-wrap">{currentUser.about || "Описание отсутствует."}</p>
            {currentUser.website && (
              <a
                href={/^https?:\/\//.test(currentUser.website) ? currentUser.website : `https://${currentUser.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[#0095f6] dark:text-[#4da6ff] font-semibold hover:underline"
              >
                {currentUser.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ----------------- HIGHLIGHTS ----------------- */}
      <Highlights userId={currentUser.id} isOwner />

      {/* ----------------- TABS SECTION ----------------- */}
      <div className="flex flex-col gap-6">
        {/* Tab Headers */}
        <div className="flex justify-center border-t border-zinc-200 dark:border-zinc-800 pt-0 gap-10 md:gap-16 text-zinc-400 select-none relative">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
              activeTab === "posts"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Grid className="w-4 h-4" />
            <span className="text-[12px] font-bold uppercase tracking-wider hidden md:inline">Публикации</span>
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
            <span className="text-[12px] font-bold uppercase tracking-wider hidden md:inline">Reels</span>
          </button>
          <button
            onClick={() => setActiveTab("reposts")}
            className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
              activeTab === "reposts"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <Repeat2 className="w-4 h-4" />
            <span className="text-[12px] font-bold uppercase tracking-wider hidden md:inline">Репосты</span>
          </button>
          <button
            onClick={() => setActiveTab("tagged")}
            className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
              activeTab === "tagged"
                ? "border-black dark:border-white text-black dark:text-white"
                : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            <UserSquare className="w-4 h-4" />
            <span className="text-[12px] font-bold uppercase tracking-wider hidden md:inline">Отмеченные</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMoreTabsMenu((v) => !v)}
              className={`flex items-center gap-1.5 py-4 border-t-2 transition cursor-pointer ${
                activeTab === "saved" || activeTab === "audios"
                  ? "border-black dark:border-white text-black dark:text-white"
                  : "border-transparent hover:text-zinc-600 dark:hover:text-zinc-300"
              }`}
            >
              <MoreHorizontal className="w-4 h-4" />
              <span className="text-[12px] font-bold uppercase tracking-wider hidden md:inline">Ещё</span>
            </button>
            {showMoreTabsMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreTabsMenu(false)} />
                <div className="absolute top-full right-0 mt-1 w-48 glass-strong rounded-2xl shadow-soft-lg overflow-hidden z-40 animate-pop-in text-left">
                  <button
                    onClick={() => { setActiveTab("saved"); setShowMoreTabsMenu(false); }}
                    className={`w-full flex items-center gap-2.5 p-3.5 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer ${activeTab === "saved" ? "text-black dark:text-white" : "text-zinc-500"}`}
                  >
                    <Bookmark className="w-4 h-4" /> Сохранённое
                  </button>
                  <button
                    onClick={() => { setActiveTab("audios"); setShowMoreTabsMenu(false); }}
                    className={`w-full flex items-center gap-2.5 p-3.5 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer ${activeTab === "audios" ? "text-black dark:text-white" : "text-zinc-500"}`}
                  >
                    <Music className="w-4 h-4" /> Звуки
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "posts" && (
          <div>
            {myPlainPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center select-none gap-6">
                <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
                  <Grid className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Поделитесь фото</h3>
                <p className="text-sm text-zinc-400 max-w-xs">Ваши публикации будут отображаться здесь.</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="text-blue-500 font-bold text-sm hover:text-blue-400 cursor-pointer"
                >
                  Поделитесь первым фото
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => (selectMode ? handleExitSelectMode() : setSelectMode(true))}
                    className="text-sm font-semibold text-zinc-500 hover:text-current cursor-pointer"
                  >
                    {selectMode ? "Отмена" : "Выбрать"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 md:gap-7">
                  {myPlainPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => (selectMode ? handleTogglePostSelect(post.id) : openInLightbox(post.id))}
                      className="relative aspect-square cursor-pointer group bg-zinc-100 dark:bg-zinc-950 overflow-hidden rounded-xl md:rounded-2xl lift shadow-soft"
                    >
                      <SmartImage src={post.image} alt="Grid thumbnail" fill sizes="(max-width: 768px) 33vw, 300px" className="object-cover transition duration-300 group-hover:scale-103" />
                      {post.isPinnedToProfile && !selectMode && (
                        <span className="absolute top-2 left-2 text-white drop-shadow">📌</span>
                      )}
                      {selectMode && (
                        <span
                          className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                            selectedPostIds.has(post.id) ? "bg-blue-500" : "bg-black/30"
                          }`}
                        >
                          {selectedPostIds.has(post.id) && <Check className="w-3.5 h-3.5 text-white" />}
                        </span>
                      )}
                      {/* Hover Overlay */}
                      {!selectMode && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-6 text-white text-base font-bold">
                          <div className="flex items-center gap-2">
                            <Heart className="w-6 h-6 fill-white" />
                            <span>{post.likes}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-6 h-6 fill-white" />
                            <span>{post.comments.length}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {selectMode && selectedPostIds.size > 0 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass-strong rounded-full shadow-soft-lg px-5 py-3 flex items-center gap-4 animate-fade-up">
                    <span className="text-sm font-semibold">{selectedPostIds.size} выбрано</span>
                    <button onClick={handleBulkArchive} disabled={bulkBusy} className="text-sm font-semibold cursor-pointer disabled:opacity-50">
                      Архивировать
                    </button>
                    <button onClick={handleBulkDelete} disabled={bulkBusy} className="text-sm font-semibold text-red-500 cursor-pointer disabled:opacity-50">
                      Удалить
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "reels" && (
          <div>
            {myReels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center select-none gap-6">
                <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
                  <Film className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Reels пока нет</h3>
                <p className="text-sm text-zinc-400 max-w-xs">Ваши Reels будут отображаться здесь.</p>
                <button
                  onClick={() => { setCreateType("reel"); setCreateOpen(true); }}
                  className="text-blue-500 font-bold text-sm hover:text-blue-400 cursor-pointer"
                >
                  Создать Reel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-7">
                {myReels.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => openInLightbox(post.id)}
                    className="relative aspect-square cursor-pointer group bg-zinc-100 dark:bg-zinc-950 overflow-hidden rounded-xl md:rounded-2xl lift shadow-soft"
                  >
                    <SmartImage src={post.image} alt="Reel thumbnail" fill sizes="(max-width: 768px) 33vw, 300px" className="object-cover transition duration-300 group-hover:scale-103" />
                    <Film className="absolute top-2 right-2 w-4 h-4 text-white drop-shadow" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-6 text-white text-base font-bold">
                      <div className="flex items-center gap-2">
                        <Heart className="w-6 h-6 fill-white" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 fill-white" />
                        <span>{post.comments.length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "reposts" && (
          <div>
            {myReposts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center select-none gap-6">
                <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
                  <Repeat2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">Репостов пока нет</h3>
                <p className="text-sm text-zinc-400 max-w-xs">Публикации, которые вы репостнули, появятся здесь.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 md:gap-7">
                {myReposts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => openInLightbox(post.id)}
                    className="relative aspect-square cursor-pointer group bg-zinc-100 dark:bg-zinc-950 overflow-hidden rounded-xl md:rounded-2xl lift shadow-soft"
                  >
                    <SmartImage src={post.image} alt="Repost thumbnail" fill sizes="(max-width: 768px) 33vw, 300px" className="object-cover transition duration-300 group-hover:scale-103" />
                    <Repeat2 className="absolute top-2 right-2 w-4 h-4 text-white drop-shadow" />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition duration-200">
                      <span className="text-white text-[11px] font-semibold truncate block">От @{post.repostedFrom}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          openCollection === null ? (
            /* ---- Folder grid: All Posts + collections + New ---- */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              {/* All Posts default folder */}
              <button
                onClick={() => handleOpenCollection("all")}
                className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-950 lift shadow-soft text-left group"
              >
                {savedPosts[0] ? (
                  <SmartImage src={savedPosts[0].image} alt="" fill sizes="(max-width:768px) 50vw, 300px" className="object-cover group-hover:scale-105 transition duration-300" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"><BookmarkIcon className="w-8 h-8 text-zinc-400" /></div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                  <span className="block text-white font-semibold text-sm">Все публикации</span>
                </div>
              </button>

              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => handleOpenCollection(col.id)}
                  className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-950 lift shadow-soft text-left group"
                >
                  {col.cover ? (
                    <SmartImage src={col.cover} alt="" fill sizes="(max-width:768px) 50vw, 300px" className="object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center"><BookmarkIcon className="w-8 h-8 text-zinc-400" /></div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                    <span className="block text-white font-semibold text-sm truncate">{col.name}</span>
                    <span className="block text-white/70 text-xs">{col.count}</span>
                  </div>
                  <span className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <span
                      onClick={(e) => { e.stopPropagation(); handleRenameCollection(col); }}
                      className="p-1.5 rounded-full bg-black/40 text-white cursor-pointer hover:bg-black/60"
                      title="Переименовать коллекцию"
                    >
                      <Pencil className="w-4 h-4" />
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleDeleteCollection(col.id); }}
                      className="p-1.5 rounded-full bg-black/40 text-white cursor-pointer hover:bg-black/60"
                      title="Удалить коллекцию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </span>
                  </span>
                </button>
              ))}

              {/* New collection tile */}
              <button
                onClick={() => setShowNewCollection(true)}
                className="aspect-square rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 transition cursor-pointer"
              >
                <Plus className="w-7 h-7" />
                <span className="text-xs font-semibold">Новая коллекция</span>
              </button>
            </div>
          ) : (
            /* ---- Inside a folder ---- */
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => { setOpenCollection(null); dispatch(fetchPostFavorites({})); }} className="hover:opacity-60 cursor-pointer">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-base flex-1">
                  {openCollection === "all" ? "Все публикации" : collections.find((c) => c.id === openCollection)?.name || "Коллекция"}
                </h3>
                {openCollection !== "all" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleInviteCollaborator(openCollection as number)}
                      className="text-xs font-semibold text-blue-500 hover:underline cursor-pointer"
                    >
                      + Участник
                    </button>
                    <button
                      onClick={() => handleRemoveCollaborator(openCollection as number)}
                      className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                    >
                      − Участник
                    </button>
                  </div>
                )}
              </div>
              {savedPosts.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-16">В этой коллекции пока нет публикаций.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1 md:gap-7">
                  {savedPosts.map((post, index) => (
                    <div
                      key={index}
                      onClick={() => setSelected({ source: "saved", index })}
                      className="relative aspect-square cursor-pointer group bg-zinc-100 dark:bg-zinc-950 overflow-hidden rounded-xl md:rounded-2xl lift shadow-soft"
                    >
                      {post.image.toLowerCase().match(/\.(mp4|mov|webm)$/) ? (
                        <video src={post.image} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <SmartImage src={post.image} alt="Saved" fill sizes="(max-width: 768px) 33vw, 300px" className="object-cover transition duration-300 group-hover:scale-105" />
                      )}
                      <div className="absolute top-2 right-2 text-white drop-shadow">
                        <BookmarkIcon className="w-5 h-5 fill-white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {activeTab === "audios" && (
          savedAudios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center select-none gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
                <Music className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold">Сохранённых звуков нет</h3>
              <p className="text-sm text-zinc-400 max-w-xs">
                Нажмите «Сохранить звук» под любым Reel — дорожка появится здесь.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full">
              {savedAudios.map((audio) => (
                <div key={audio.audioId} className="flex items-center gap-4 glass rounded-2xl p-3.5 shadow-soft">
                  <div className="w-12 h-12 rounded-xl btn-primary flex items-center justify-center flex-shrink-0">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-left">
                    <span className="font-semibold text-sm truncate">{audio.title}</span>
                    <span className="text-xs text-zinc-500 truncate">{audio.artist || "Неизвестный исполнитель"}</span>
                  </div>
                  {audio.audioUrl && (
                    <audio src={audio.audioUrl} controls className="h-9 max-w-[220px] flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "tagged" && (
          <>
          {(tagRequests.length + collabRequests.length) > 0 && (
            <button
              onClick={() => setShowRequests(true)}
              className="w-full flex items-center justify-between glass rounded-2xl px-4 py-3 mb-4 hover:shadow-soft transition cursor-pointer"
            >
              <span className="text-sm font-semibold">Запросы на отметку и соавторство</span>
              <span className="text-xs font-bold btn-primary rounded-full px-2 py-0.5">
                {tagRequests.length + collabRequests.length}
              </span>
            </button>
          )}
          {taggedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center select-none gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
                <UserSquare className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold">Фото с вами</h3>
              <p className="text-sm text-zinc-400 max-w-xs">
                Когда вас отметят на фото, эти публикации появятся здесь.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-7">
              {taggedPosts.map((post, index) => (
                <div
                  key={index}
                  onClick={() => setSelected({ source: "tagged", index })}
                  className="relative aspect-square cursor-pointer group bg-zinc-100 dark:bg-zinc-950 overflow-hidden rounded-xl md:rounded-2xl lift shadow-soft"
                >
                  <SmartImage src={post.image} alt="Tagged" fill sizes="(max-width: 768px) 33vw, 300px" className="object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute top-2 right-2 text-white drop-shadow">
                    <UserSquare className="w-5 h-5" />
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
        )}

        {activeTab === "archived" && (
          archivedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center select-none gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold">Архив пуст</h3>
              <p className="text-sm text-zinc-400 max-w-xs">
                Архивированные публикации видны только вам и не отображаются в профиле.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-7">
              {archivedPosts.map((post, index) => (
                <div
                  key={index}
                  className="relative aspect-square group bg-zinc-100 dark:bg-zinc-950 overflow-hidden rounded-xl md:rounded-2xl lift shadow-soft"
                >
                  <SmartImage src={post.image} alt="Archived" fill sizes="(max-width: 768px) 33vw, 300px" className="object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center">
                    <button
                      onClick={() => handleUnarchive(post.id)}
                      className="flex items-center gap-1.5 bg-white/90 text-black text-xs font-bold px-3 py-2 rounded-full hover:bg-white cursor-pointer"
                    >
                      <ArchiveRestore className="w-4 h-4" />
                      Показать в профиле
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ----------------- ACCOUNT SWITCHER (#23) ----------------- */}
      {showSwitcher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowSwitcher(false)}>
          <div className="glass-strong w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-soft-lg animate-in slide-in-from-bottom sm:zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center p-4 border-b border-zinc-200 dark:border-zinc-700/60 relative">
              <span className="text-sm font-bold">{addMode ? "Добавить аккаунт" : "Сменить аккаунт"}</span>
              <button onClick={() => setShowSwitcher(false)} className="absolute right-4 hover:opacity-60 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            {addMode ? (
              <div className="p-4 flex flex-col gap-3">
                <input
                  type="text"
                  autoFocus
                  placeholder="Имя пользователя"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none"
                />
                <input
                  type="password"
                  placeholder="Пароль"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none"
                />
                <button
                  onClick={handleAddAccount}
                  disabled={switchBusy || !addUsername.trim() || !addPassword}
                  className="btn-primary py-2.5 text-sm disabled:opacity-50"
                >
                  Войти и связать
                </button>
                <button onClick={() => setAddMode(false)} className="text-sm text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer">
                  Назад
                </button>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {/* Current account */}
                <div className="flex items-center gap-3 p-3.5 bg-black/[0.02] dark:bg-white/[0.03]">
                  <Avatar src={getFullImageUrl(currentUser.avatar)} name={currentUser.username} className="w-11 h-11" />
                  <span className="flex-1 text-sm font-semibold">{currentUser.username}</span>
                  <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">✓</span>
                </div>
                {linkedAccounts
                  .filter((a) => (a.id || a.userId) !== currentUser.id)
                  .map((a) => {
                    const uid = a.id || a.userId;
                    return (
                      <button key={uid} onClick={() => handleSwitchAccount(uid)} disabled={switchBusy} className="w-full flex items-center gap-3 p-3.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer text-left">
                        <Avatar src={getFullImageUrl(a.avatar || a.imagePath)} name={a.userName || a.username} className="w-11 h-11" />
                        <span className="flex-1 text-sm font-semibold truncate">{a.userName || a.username}</span>
                      </button>
                    );
                  })}
                <button onClick={() => setAddMode(true)} className="w-full flex items-center gap-3 p-3.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition cursor-pointer text-left">
                  <span className="w-11 h-11 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center flex-shrink-0">
                    <PlusIcon className="w-5 h-5 text-zinc-400" />
                  </span>
                  <span className="text-sm font-semibold text-blue-500">Добавить аккаунт</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- INSIGHTS MODAL (#20) ----------------- */}
      {showInsights && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowInsights(false)}>
          <div className="glass-strong w-full max-w-md rounded-3xl overflow-hidden shadow-soft-lg animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-700/60">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                <span className="text-base font-bold">Статистика</span>
              </div>
              <button onClick={() => setShowInsights(false)} className="hover:opacity-60 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            {!insights ? (
              <div className="py-16 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="p-5 flex flex-col gap-4">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  {insights.accountType === "CREATOR" ? "Аккаунт автора" : "Бизнес-аккаунт"}
                </span>
                {/* KPI tiles — neutral grayscale per the design system (content stays the focus) */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Eye, label: "Посещений профиля", value: insights.profileVisitCount },
                    { icon: TrendingUp, label: "Охват", value: insights.estimatedReach },
                    { icon: Heart, label: "Всего отметок «Нравится»", value: insights.totalLikes },
                    { icon: MessageCircle, label: "Всего комментариев", value: insights.totalComments },
                  ].map((t) => (
                    <div key={t.label} className="flex flex-col gap-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                      <t.icon className="w-4 h-4 text-zinc-400" />
                      <span className="text-2xl font-bold tabular-nums">{(t.value ?? 0).toLocaleString()}</span>
                      <span className="text-[11px] text-zinc-500 leading-tight">{t.label}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { label: "Публикаций", value: insights.postsCount },
                    { label: "Подписчиков", value: insights.followersCount },
                    { label: "Подписок", value: insights.followingCount },
                  ].map((t) => (
                    <div key={t.label} className="flex flex-col items-center">
                      <span className="text-lg font-bold tabular-nums">{(t.value ?? 0).toLocaleString()}</span>
                      <span className="text-[10px] text-zinc-500">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAG / COLLAB REQUESTS MODAL ----------------- */}
      {showRequests && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRequests(false)}>
          <div className="glass-strong w-full max-w-md rounded-3xl overflow-hidden shadow-soft-lg flex flex-col max-h-[80vh] animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700/60">
              <span className="text-sm font-bold">Запросы</span>
              <button onClick={() => setShowRequests(false)} className="hover:opacity-60 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
              {tagRequests.length === 0 && collabRequests.length === 0 && (
                <p className="text-center text-sm text-zinc-400 py-10">Новых запросов нет.</p>
              )}
              {tagRequests.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Отметки на фото</span>
                  {tagRequests.map((r) => {
                    const pid = r.id ?? r.postId;
                    const img = getFullImageUrl((r.images && r.images[0]) || r.filePath || r.imagePath || r.image);
                    return (
                      <div key={pid} className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                          {img && <SmartImage src={img} alt="" className="w-full h-full object-cover" />}
                        </span>
                        <span className="flex-1 text-sm min-w-0 truncate">
                          <span className="font-semibold">{r.userName || r.username || "Пользователь"}</span> отметил(а) вас
                        </span>
                        <button onClick={() => handleTagRequest(pid, true)} className="text-xs font-bold btn-primary px-3 py-1.5 rounded-lg cursor-pointer">Принять</button>
                        <button onClick={() => handleTagRequest(pid, false)} className="text-xs font-bold glass px-3 py-1.5 rounded-lg cursor-pointer">Удалить</button>
                      </div>
                    );
                  })}
                </div>
              )}
              {collabRequests.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Соавторство</span>
                  {collabRequests.map((r) => {
                    const pid = r.id ?? r.postId;
                    const img = getFullImageUrl((r.images && r.images[0]) || r.filePath || r.imagePath || r.image);
                    return (
                      <div key={pid} className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
                          {img && <SmartImage src={img} alt="" className="w-full h-full object-cover" />}
                        </span>
                        <span className="flex-1 text-sm min-w-0 truncate">
                          <span className="font-semibold">{r.userName || r.username || "Пользователь"}</span> приглашает в соавторы
                        </span>
                        <button onClick={() => handleCollabRequest(pid, true)} className="text-xs font-bold btn-primary px-3 py-1.5 rounded-lg cursor-pointer">Принять</button>
                        <button onClick={() => handleCollabRequest(pid, false)} className="text-xs font-bold glass px-3 py-1.5 rounded-lg cursor-pointer">Удалить</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- NEW COLLECTION MODAL ----------------- */}
      {showNewCollection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNewCollection(false)}>
          <div className="glass-strong w-full max-w-xs rounded-3xl overflow-hidden shadow-soft-lg animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 flex flex-col gap-4 text-center">
              <h3 className="font-bold text-base">Новая коллекция</h3>
              <input
                type="text"
                autoFocus
                placeholder="Название"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
                className="w-full text-center border-b border-zinc-200 dark:border-zinc-700 bg-transparent py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>
            <div className="flex divide-x divide-zinc-200 dark:divide-zinc-700/60 border-t border-zinc-200 dark:border-zinc-700/60">
              <button onClick={() => { setShowNewCollection(false); setNewCollectionName(""); }} className="flex-1 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                Отмена
              </button>
              <button onClick={handleCreateCollection} disabled={!newCollectionName.trim()} className="flex-1 py-3 text-sm font-bold text-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer disabled:opacity-50">
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- FOLLOWERS MODAL ----------------- */}
      {showFollowersList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="w-6" />
              <h3 className="font-bold text-base">Подписчики</h3>
              <button onClick={() => setShowFollowersList(false)} className="hover:opacity-70">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 flex flex-col gap-4.5">
              {followers.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Нет подписчиков.</p>
              ) : (
                followers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/u/${user.id}`}
                      onClick={() => setShowFollowersList(false)}
                      className="flex items-center gap-3 hover:opacity-80 transition min-w-0"
                    >
                      <Avatar src={user.avatar} name={user.username} className="w-10 h-10 border border-zinc-200 dark:border-zinc-800" />
                      <div className="flex flex-col text-left min-w-0">
                        <span className="font-bold text-sm leading-none truncate">{user.username}</span>
                        <span className="text-xs text-zinc-400 leading-none mt-1 truncate">{user.name}</span>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleRemoveFollower(user.id)}
                      disabled={removingFollowerId === user.id}
                      className="text-xs font-semibold text-zinc-500 hover:text-red-500 cursor-pointer flex-shrink-0 disabled:opacity-50"
                    >
                      Удалить
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- FOLLOWING MODAL ----------------- */}
      {showFollowingList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="w-6" />
              <h3 className="font-bold text-base">Подписки</h3>
              <button onClick={() => setShowFollowingList(false)} className="hover:opacity-70">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[400px] p-4 flex flex-col gap-4.5">
              {following.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center py-8">Нет подписок.</p>
              ) : (
                following.map((user) => (
                  <Link
                    key={user.id}
                    href={`/u/${user.id}`}
                    onClick={() => setShowFollowingList(false)}
                    className="flex items-center justify-between hover:opacity-80 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatar} name={user.username} className="w-10 h-10 border border-zinc-200 dark:border-zinc-800" />
                      <div className="flex flex-col text-left">
                        <span className="font-bold text-sm leading-none">{user.username}</span>
                        <span className="text-xs text-zinc-400 leading-none mt-1">{user.name}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFollowToggle(user.id, user.following, user.username);
                      }}
                      className={`text-xs font-bold px-4 py-1.5 rounded-lg border transition ${
                        user.following
                          ? "bg-transparent text-zinc-500 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          : "bg-blue-500 text-white border-transparent hover:bg-blue-600"
                      }`}
                    >
                      {user.following ? "Подписки" : "Подписаться"}
                    </button>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- POST DETAILS DIALOG ----------------- */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row w-full max-w-4xl max-h-[85vh] relative animate-in zoom-in-95 duration-150">
            {/* Close button outside details */}
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-white md:text-zinc-500 hover:text-zinc-300 p-2 z-55"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Column: Image */}
            <div className="flex-1 bg-zinc-950 flex items-center justify-center max-h-[45vh] md:max-h-full">
              {selectedPost.isReel && selectedPost.videoUrl ? (
                <video src={selectedPost.videoUrl} controls autoPlay loop className="w-full h-full object-contain aspect-square" />
              ) : (
                <SmartImage src={selectedPost.image} alt="Detail" sizes="(max-width: 768px) 100vw, 640px" className="w-full h-full object-contain aspect-square" />
              )}
            </div>

            {/* Right Column: Feed and interactions */}
            <div className="w-full md:w-[380px] flex flex-col border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 h-[40vh] md:h-auto">
              {/* Header profile */}
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <Link href={selectedPost.userId ? `/u/${selectedPost.userId}` : "#"} className="flex items-center gap-3">
                  <Avatar src={selectedPost.avatar} name={selectedPost.username} className="w-8 h-8 border border-zinc-200" />
                  <span className="font-bold text-sm">{selectedPost.username}</span>
                </Link>
              </div>

              {/* Comments Scroller */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-left">
                {/* Caption as first comment */}
                <div className="flex items-start gap-3 text-sm">
                  <Link href={selectedPost.userId ? `/u/${selectedPost.userId}` : "#"}>
                    <Avatar src={selectedPost.avatar} name={selectedPost.username} className="w-8 h-8 border border-zinc-200" />
                  </Link>
                  <p className="leading-snug">
                    <Link href={selectedPost.userId ? `/u/${selectedPost.userId}` : "#"} className="font-bold mr-2 hover:underline cursor-pointer">
                      {selectedPost.username}
                    </Link>
                    {selectedPost.caption}
                  </p>
                </div>

                <hr className="border-zinc-200 dark:border-zinc-800" />

                {/* Other Comments */}
                {selectedPost.comments.map((comment, index: number) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <Link href={comment.userId ? `/u/${comment.userId}` : "#"}>
                      <Avatar name={comment.username} className="w-8 h-8 border border-zinc-200" />
                    </Link>
                    <p className="leading-snug">
                      <Link href={comment.userId ? `/u/${comment.userId}` : "#"} className="font-bold mr-2 hover:underline cursor-pointer">{comment.username}</Link>
                      {comment.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Action Bar */}
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <button onClick={() => handleLikePostDetail(selectedPost.id)} className="hover:scale-105 active:scale-95 transition">
                      <Heart className={`w-6 h-6 ${selectedPost.isLiked ? "text-red-500 fill-red-500" : "text-black dark:text-white"}`} />
                    </button>
                  </div>
                  {!isSelectedFromSaved ? (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleArchiveFromDetail(selectedPost.id)}
                        className="text-xs font-bold text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer flex items-center gap-1.5"
                        title="Архивировать публикацию"
                      >
                        <Clock className="w-4 h-4" /> Архивировать
                      </button>
                      <button
                        onClick={() => handleDeletePost(selectedPost.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-400 cursor-pointer flex items-center gap-1.5"
                        title="Удалить публикацию"
                      >
                        <Trash2 className="w-4 h-4" /> Удалить
                      </button>
                      <button
                        onClick={() => setShowDetailMenu(true)}
                        className="text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer"
                        title="Ещё"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUnsave(selectedPost.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-400 cursor-pointer flex items-center gap-1"
                    >
                      <BookmarkIcon className="w-4 h-4 fill-current" /> Убрать
                    </button>
                  )}
                </div>
                <span className="font-bold text-sm text-left">{selectedPost.likes} likes</span>
              </div>

              {/* Form Input */}
              <form onSubmit={handleAddCommentDetail} className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Добавить комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="bg-transparent text-sm w-full outline-none placeholder-zinc-400 border-none ring-0 p-0 text-black dark:text-white"
                />
                {newComment.trim() && (
                  <button type="submit" className="text-blue-500 font-semibold text-sm hover:text-blue-400 cursor-pointer">
                    Опубликовать
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
      {activeStory && (
        <StoryViewer
          key={activeStory.id}
          story={activeStory}
          list={myStories}
          currentUserId={currentUser.id}
          onNavigate={handleNavigateStory}
          onClose={() => setActiveStoryId(null)}
          onReport={() => {}}
        />
      )}

      {/* ----------------- POST SETTINGS MENU (own post, from within the profile) ----------------- */}
      {showDetailMenu && selectedPost && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={() => setShowDetailMenu(false)}
        >
          <div
            className="glass-strong w-full max-w-sm rounded-3xl overflow-hidden shadow-soft-lg flex flex-col divide-y divide-zinc-200 dark:divide-zinc-700/60 text-center animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {isProfessional && (
              <button
                onClick={() => { setShowDetailMenu(false); router.push(`/p/${selectedPost.id}`); }}
                className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Статистика
              </button>
            )}
            <button
              onClick={() => handlePinToProfileDetail(selectedPost)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {selectedPost.isPinnedToProfile ? "Открепить от профиля" : "Закрепить в профиле"}
            </button>
            <button
              onClick={() => handleOpenEditCaption(selectedPost)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Редактировать подпись
            </button>
            <button
              onClick={() => handleTogglePostComments(selectedPost)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {selectedPost.allowComments ? "Выключить комментарии" : "Включить комментарии"}
            </button>
            {selectedPost.allowComments && (
              <div className="px-4 py-2 flex flex-col gap-1 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Кто может комментировать</span>
                {([
                  ["EVERYONE", "Все"],
                  ["FOLLOWING", "Подписки"],
                  ["FOLLOWERS", "Подписчики"],
                ] as const).map(([value, label]) => {
                  const active = (selectedPost.commentPermission || "EVERYONE") === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleSetCommentPermissionDetail(selectedPost, value)}
                      className="flex items-center justify-between py-2 text-sm hover:opacity-70 cursor-pointer text-left"
                    >
                      <span className={active ? "font-semibold text-blue-500" : ""}>{label}</span>
                      {active && <span className="text-blue-500">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => handleToggleLikeCountDetail(selectedPost)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {selectedPost.hideLikeCount ? "Показать количество отметок" : "Скрыть количество отметок"}
            </button>
            <button
              onClick={() => handleToggleSensitiveDetail(selectedPost)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {selectedPost.isSensitive ? "Снять отметку «деликатное»" : "Отметить как деликатное"}
            </button>
            <button
              onClick={() => handleToggleAgeRestrictedDetail(selectedPost)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {selectedPost.isAgeRestricted ? "Снять возрастное ограничение" : "Отметить 18+"}
            </button>
            <button
              onClick={() => handleToggleStorySharingDetail(selectedPost)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {selectedPost.allowStorySharing ? "Запретить репост в истории" : "Разрешить репост в истории"}
            </button>
            <button
              onClick={() => handleShareToStoryDetail(selectedPost.id)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Добавить в историю
            </button>
            <button
              onClick={() => handleCopyDetailLink(selectedPost.id)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {detailCopied ? "Ссылка скопирована ✓" : "Скопировать ссылку"}
            </button>
            <button
              onClick={() => setShowDetailMenu(false)}
              className="py-3.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* ----------------- EDIT CAPTION MODAL (from within the profile) ----------------- */}
      {editingCaptionPostId !== null && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={() => !editCaptionBusy && setEditingCaptionPostId(null)}
        >
          <div
            className="glass-strong w-full max-w-md rounded-3xl overflow-hidden shadow-soft-lg animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700/60">
              <button
                onClick={() => setEditingCaptionPostId(null)}
                disabled={editCaptionBusy}
                className="text-sm text-zinc-500 hover:text-black dark:hover:text-white cursor-pointer disabled:opacity-60"
              >
                Отмена
              </button>
              <span className="text-sm font-bold">Редактировать</span>
              <button
                onClick={handleSaveEditCaption}
                disabled={editCaptionBusy}
                className="text-sm font-bold text-blue-500 hover:text-blue-300 cursor-pointer disabled:opacity-60"
              >
                {editCaptionBusy ? "Сохранение…" : "Готово"}
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={editCaptionText}
                onChange={(e) => setEditCaptionText(e.target.value)}
                placeholder="Добавьте подпись…"
                rows={4}
                autoFocus
                className="w-full bg-transparent text-sm resize-none outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
