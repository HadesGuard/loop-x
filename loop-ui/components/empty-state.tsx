"use client"

import { Inbox, Search, Video, Heart, Bookmark, Users, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface EmptyStateProps {
  type: "comments" | "videos" | "liked" | "saved" | "followers" | "following" | "messages" | "search" | "notifications"
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ type, title, description, actionLabel, onAction }: EmptyStateProps) {
  const router = useRouter()

  const configs = {
    comments: {
      icon: MessageCircle,
      title: title || "No comments yet",
      description: description || "Be the first to comment on this video!",
      actionLabel: actionLabel || "Add a comment",
    },
    videos: {
      icon: Video,
      title: title || "No videos yet",
      description: description || "Start creating and sharing your videos",
      actionLabel: actionLabel || "Upload video",
    },
    liked: {
      icon: Heart,
      title: title || "No liked videos",
      description: description || "Videos you like will appear here",
      actionLabel: actionLabel || "Explore videos",
    },
    saved: {
      icon: Bookmark,
      title: title || "No saved videos",
      description: description || "Save videos to watch them later",
      actionLabel: actionLabel || "Discover videos",
    },
    followers: {
      icon: Users,
      title: title || "No followers yet",
      description: description || "Share your profile to get more followers",
      actionLabel: actionLabel || "Share profile",
    },
    following: {
      icon: Users,
      title: title || "Not following anyone",
      description: description || "Follow creators to see their videos in your feed",
      actionLabel: actionLabel || "Discover creators",
    },
    messages: {
      icon: Inbox,
      title: title || "No messages yet",
      description: description || "Start a conversation with someone",
      actionLabel: actionLabel || "Find friends",
    },
    search: {
      icon: Search,
      title: title || "No results found",
      description: description || "Try searching with different keywords",
      actionLabel: actionLabel || "Clear search",
    },
    notifications: {
      icon: Inbox,
      title: title || "No notifications",
      description: description || "You're all caught up!",
      actionLabel: undefined,
    },
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-white/40" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{config.title}</h3>
      <p className="text-white/60 text-sm mb-6 max-w-sm">{config.description}</p>
      {config.actionLabel && (
        <button
          onClick={onAction || (() => router.push("/discover"))}
          className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all"
        >
          {config.actionLabel}
        </button>
      )}
    </div>
  )
}


