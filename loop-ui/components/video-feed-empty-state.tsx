"use client"

import { User } from "lucide-react"

interface VideoFeedEmptyStateProps {
  onSwitchToForYou: () => void
}

export function VideoFeedEmptyState({ onSwitchToForYou }: VideoFeedEmptyStateProps) {
  return (
    <div className="h-screen flex flex-col items-center justify-center px-8 text-center">
      <User className="w-20 h-20 text-gray-500 mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">No videos yet</h2>
      <p className="text-gray-400 mb-6">Follow creators to see their videos in your Following feed</p>
      <button
        onClick={onSwitchToForYou}
        className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
      >
        Browse For You
      </button>
    </div>
  )
}

