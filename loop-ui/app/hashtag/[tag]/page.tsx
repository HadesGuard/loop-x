"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Hash, TrendingUp, Play, Bookmark, Loader2 } from "lucide-react"
import { BottomNavigation } from "@/components/bottom-navigation"
import { api } from "@/lib/api/api"
import { formatViews } from "@/lib/format"
import type { Video } from "@/types/video"

export default function HashtagPage() {
  const router = useRouter()
  const params = useParams()
  const tag = params.tag as string

  const [sortBy, setSortBy] = useState<"trending" | "recent">("trending")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const authToken = localStorage.getItem("auth_token")
    setIsAuthenticated(!!authToken)
  }, [])

  const loadVideos = useCallback(async (pageNum: number, reset = false) => {
    try {
      if (reset) setLoading(true)
      else setLoadingMore(true)

      const result = await api.getHashtagPage(tag, pageNum, 12)

      if (reset) {
        setVideos(result)
      } else {
        setVideos((prev) => [...prev, ...result])
      }
      setHasMore(result.length >= 12)
      setPage(pageNum)
    } catch {
      // Failed to load videos
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tag])

  useEffect(() => {
    loadVideos(1, true)
  }, [loadVideos])

  const handleSortChange = (sort: "trending" | "recent") => {
    setSortBy(sort)
    if (sort === "recent") {
      setVideos((prev) => [...prev].sort((a, b) => (b.id || 0) - (a.id || 0)))
    } else {
      setVideos((prev) => [...prev].sort((a, b) => (b.views || 0) - (a.views || 0)))
    }
  }

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadVideos(page + 1)
    }
  }

  const handleNotificationClick = () => {
    startTransition(() => {
      router.push("/inbox")
    })
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-4 px-4 py-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Hash className="w-6 h-6 text-pink-400" />
              <h1 className="text-2xl font-bold">{tag}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Hashtag Info */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Videos</p>
              <p className="text-white text-xl font-bold">{formatViews(videos.length)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Views</p>
              <p className="text-white text-xl font-bold">
                {formatViews(videos.reduce((sum, v) => sum + (v.views || 0), 0))}
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all">
            <Bookmark className="w-4 h-4" />
            Follow
          </button>
        </div>

        {/* Sort Options */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSortChange("trending")}
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
            onClick={() => handleSortChange("recent")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              sortBy === "recent"
                ? "bg-white text-black"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
            }`}
          >
            Recent
          </button>
        </div>
      </div>

      {/* Videos Grid */}
      <div className="p-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/60">
            <Hash className="w-12 h-12 mb-4" />
            <p className="text-lg font-medium">No videos found</p>
            <p className="text-sm">Be the first to post with #{tag}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {videos.map((video) => (
                <div
                  key={video.originalId || video.id}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 cursor-pointer group"
                  onClick={() => router.push(`/video/${video.originalId || video.id}`)}
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
                    <p className="text-white/70 text-xs">{video.username}</p>
                    <div className="flex items-center gap-3 text-white text-xs">
                      <div className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        {formatViews(video.views || 0)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white font-medium transition-all disabled:opacity-50"
                >
                  {loadingMore ? (
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
