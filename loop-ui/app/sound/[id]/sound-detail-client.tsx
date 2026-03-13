"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Music, Play, Heart, Bookmark, TrendingUp, Loader2, Clock, Eye } from "lucide-react"
import { BottomNavigation } from "@/components/bottom-navigation"
import { api } from "@/lib/api/api"
import { formatViews } from "@/lib/format"
import { toast } from "sonner"

interface SoundDetail {
  id: string
  title: string
  artist: string
  artistId: string
  artistInfo: { id: string; username: string; avatar: string | null; isVerified: boolean }
  duration: number | null
  url: string | null
  thumbnail: string | null
  genre: string | null
  tags: string[]
  totalVideos: number
  totalViews: string
  totalLikes: number
  isFavorited: boolean
  isOriginal: boolean
  description: string | null
  createdAt: string
}

interface SoundVideo {
  id: string
  thumbnail: string | null
  caption: string
  username: string
  views: string
  likes: number
  duration: number | null
}

export function SoundDetailClient() {
  const router = useRouter()
  const params = useParams()
  const soundId = params.id as string

  const [sound, setSound] = useState<SoundDetail | null>(null)
  const [videos, setVideos] = useState<SoundVideo[]>([])
  const [sortBy, setSortBy] = useState<"trending" | "recent" | "popular">("trending")
  const [isLoading, setIsLoading] = useState(true)
  const [isVideosLoading, setIsVideosLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pagination, setPagination] = useState<{ hasMore: boolean; page: number }>({ hasMore: false, page: 1 })

  useEffect(() => {
    const authToken = localStorage.getItem("auth_token")
    setIsAuthenticated(!!authToken)
  }, [])

  const loadSound = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await api.getSoundById(soundId)
      setSound(data)
      setIsFavorited(data.isFavorited)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sound")
    } finally {
      setIsLoading(false)
    }
  }, [soundId])

  const loadVideos = useCallback(async (sort: string, page = 1) => {
    try {
      setIsVideosLoading(true)
      const data = await api.getSoundVideos(soundId, sort, page)
      if (page === 1) {
        setVideos(data.videos)
      } else {
        setVideos((prev) => [...prev, ...data.videos])
      }
      setPagination({ hasMore: data.pagination.hasMore, page: data.pagination.page })
    } catch {
      toast.error("Failed to load videos")
    } finally {
      setIsVideosLoading(false)
    }
  }, [soundId])

  useEffect(() => {
    loadSound()
  }, [loadSound])

  useEffect(() => {
    loadVideos(sortBy)
  }, [sortBy, loadVideos])

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to favorite sounds")
      return
    }
    try {
      const result = await api.toggleSoundFavorite(soundId)
      setIsFavorited(result.favorited)
      toast.success(result.favorited ? "Added to favorites" : "Removed from favorites")
    } catch {
      toast.error("Failed to update favorite")
    }
  }

  const handleLoadMore = () => {
    if (pagination.hasMore && !isVideosLoading) {
      loadVideos(sortBy, pagination.page + 1)
    }
  }

  const handleNotificationClick = () => {
    startTransition(() => {
      router.push("/inbox")
    })
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (error || !sound) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
          <div className="flex items-center gap-4 px-4 py-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold">Sound</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Music className="w-16 h-16 text-white/20" />
          <p className="text-white/60 text-lg">{error || "Sound not found"}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-4 px-4 py-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Music className="w-6 h-6 text-purple-400" />
              <h1 className="text-xl font-bold line-clamp-1">{sound.title}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Sound Info */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-start gap-4 mb-6">
          {/* Sound Thumbnail */}
          <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {sound.thumbnail ? (
              <img src={sound.thumbnail} alt={sound.title} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-12 h-12 text-white" />
            )}
          </div>

          {/* Sound Details */}
          <div className="flex-1">
            <h2 className="text-white text-xl font-bold mb-1">{sound.title}</h2>
            <button
              onClick={() => router.push(`/?profile=${sound.artistInfo.username}`)}
              className="text-gray-400 text-sm mb-2 hover:text-white transition-colors"
            >
              {sound.artist}
            </button>
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(sound.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Play className="w-3.5 h-3.5" />
                {formatViews(sound.totalVideos)} videos
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {sound.totalViews} views
              </span>
            </div>
            {sound.genre && (
              <span className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium mb-3">
                {sound.genre}
              </span>
            )}
            {sound.description && (
              <p className="text-gray-400 text-sm mb-3">{sound.description}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleToggleFavorite}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold transition-all ${
                  isFavorited
                    ? "bg-pink-500 text-white hover:bg-pink-600"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
                {isFavorited ? "Favorited" : "Favorite"}
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error("Please login to use sounds")
                    return
                  }
                  router.push(`/studio?soundId=${sound.id}`)
                }}
                className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-all border border-white/10"
              >
                <Music className="w-4 h-4" />
                Use this sound
              </button>
            </div>
          </div>
        </div>

        {/* Tags */}
        {sound.tags && sound.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {sound.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs border border-white/10">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Sort Options */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy("trending")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              sortBy === "trending"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </div>
          </button>
          <button
            onClick={() => setSortBy("recent")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              sortBy === "recent"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortBy("popular")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              sortBy === "popular"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
            }`}
          >
            Popular
          </button>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="p-4 pb-24">
        <h3 className="text-white font-semibold mb-4">Videos using this sound</h3>
        {isVideosLoading && videos.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-[9/16] rounded-xl bg-neutral-900 animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <Play className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">No videos using this sound yet</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 cursor-pointer group"
                  onClick={() => router.push(`/video/${video.id}`)}
                >
                  <img
                    src={video.thumbnail || "/placeholder.svg"}
                    alt={video.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-12 h-12 text-white" />
                  </div>

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                    <p className="text-white text-sm font-medium line-clamp-2">{video.caption}</p>
                    <p className="text-white/70 text-xs">@{video.username}</p>
                    <div className="flex items-center gap-3 text-white text-xs">
                      <div className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        {video.views}
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {formatViews(video.likes)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {pagination.hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={isVideosLoading}
                  className="px-8 py-3 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-all disabled:opacity-50 border border-white/10"
                >
                  {isVideosLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentPage="discover"
        onNavigate={(page) => {
          if (page === "profile") {
            startTransition(() => {
              router.push("/")
            })
          } else {
            startTransition(() => {
              router.push(page)
            })
          }
        }}
        isAuthenticated={isAuthenticated}
        unreadCount={0}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  )
}
