"use client"

import { ArrowLeft, Clock, Trash2, Play } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useTransition } from "react"
import { BottomNavigation } from "@/components/bottom-navigation"
import { api } from "@/lib/api/api"
import { formatViews } from "@/lib/format"
import { toast } from "sonner"

interface HistoryItem {
  id: string
  video: {
    id: string
    thumbnail: string | null
    title: string
    description: string | null
    duration: number | null
    views: number
    user: {
      id: string
      username: string
      avatar: string | null
      isVerified: boolean
    }
  }
  watchedDuration: number
  watchedAt: string
  createdAt: string
}

export default function WatchHistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const authToken = localStorage.getItem("auth_token")
    setIsAuthenticated(!!authToken)
    
    if (authToken) {
      loadHistory()
    } else {
      setIsLoading(false)
    }
  }, [])

  const loadHistory = async () => {
    try {
      setIsLoading(true)
      const data = await api.getWatchHistory(1, 50)
      setHistory(data)
    } catch (error) {
      console.error("Error loading watch history:", error)
      toast.error("Failed to load watch history")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = () => {
    startTransition(() => {
      router.push("/inbox")
    })
  }

  const handleSelectVideo = (id: string) => {
    const newSelected = new Set(selectedVideos)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedVideos(newSelected)
  }

  const handleClearHistory = async () => {
    if (selectedVideos.size > 0) {
      try {
        await api.clearWatchHistory(Array.from(selectedVideos))
        await loadHistory()
        setSelectedVideos(new Set())
        toast.success("Videos removed from history")
      } catch (error) {
        console.error("Error clearing history:", error)
        toast.error("Failed to remove videos")
      }
    } else {
      try {
        await api.clearWatchHistory()
        await loadHistory()
        toast.success("Watch history cleared")
      } catch (error) {
        console.error("Error clearing history:", error)
        toast.error("Failed to clear history")
      }
    }
  }

  const handleRemoveVideo = async (videoId: string) => {
    try {
      await api.removeFromWatchHistory(videoId)
      await loadHistory()
      toast.success("Video removed from history")
    } catch (error) {
      console.error("Error removing video:", error)
      toast.error("Failed to remove video")
    }
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-white text-xl font-bold">Watch History</h1>
              <p className="text-white/60 text-sm">{history.length} videos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedVideos.size > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedVideos.size})
              </button>
            )}
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60 text-sm">Loading watch history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-20">
            <Clock className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-white text-xl font-semibold mb-2">No watch history</h3>
            <p className="text-white/60 text-sm">Videos you watch will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
              >
                {/* Checkbox */}
                <div className="flex items-start pt-1">
                  <input
                    type="checkbox"
                    checked={selectedVideos.has(item.id)}
                    onChange={() => handleSelectVideo(item.id)}
                    className="w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-blue-500 cursor-pointer"
                  />
                </div>

                {/* Thumbnail */}
                <div 
                  className="relative w-40 h-24 rounded-lg overflow-hidden flex-shrink-0 group cursor-pointer"
                  onClick={() => router.push(`/video/${item.video.id}`)}
                >
                  <img
                    src={item.video.thumbnail || "/placeholder.svg"}
                    alt={item.video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  {item.video.duration && (
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-white text-xs font-semibold">
                      {formatDuration(item.video.duration)}
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold line-clamp-2 mb-1">{item.video.title}</h3>
                  <p className="text-white/60 text-sm mb-2">{item.video.user.username}</p>
                  <div className="flex items-center gap-3 text-white/40 text-xs">
                    <span>{formatViews(item.video.views)} views</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.watchedAt}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleRemoveVideo(item.video.id)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-white/60 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentPage="home"
        onNavigate={(page) => {
          if (page === "profile") {
            router.push("/")
          } else {
            router.push(page)
          }
        }}
        isAuthenticated={isAuthenticated}
        unreadCount={0}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  )
}
