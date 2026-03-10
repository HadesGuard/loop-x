"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, TrendingUp, Users, Hash, Play, Heart, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react"
import { BottomNavigation } from "@/components/bottom-navigation"
import { api } from "@/lib/api/api"
import type { Video } from "@/types/video"
import type { ApiUserResponse } from "@/types/api"
import { formatViews } from "@/lib/format"
import { toast } from "sonner"

export default function DiscoverPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"trending" | "creators" | "hashtags">("trending")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [trendingVideos, setTrendingVideos] = useState<Video[]>([])
  const [topCreators, setTopCreators] = useState<ApiUserResponse[]>([])
  const [trendingHashtags, setTrendingHashtags] = useState<Array<{ tag: string; views: string }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const authToken = localStorage.getItem("auth_token")
    setIsAuthenticated(!!authToken)
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      setIsLoading(true)
      if (activeTab === "trending") {
        const videos = await api.getTrendingVideos(20)
        setTrendingVideos(videos)
      } else if (activeTab === "creators") {
        const creators = await api.getTopCreators(20)
        setTopCreators(creators)
      } else if (activeTab === "hashtags") {
        const hashtags = await api.getTrendingHashtags(20)
        setTrendingHashtags(hashtags)
      }
    } catch (error) {
      console.error("Error loading discover data:", error)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = () => {
    startTransition(() => {
      router.push("/inbox")
    })
  }

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-4 px-4 py-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold">Discover</h1>
          <div className="flex-1" />
          <button
            onClick={() => router.push("/?search=true")}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Search className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 px-4 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("trending")}
            className={`py-3 px-2 font-medium transition-all relative whitespace-nowrap ${
              activeTab === "trending" ? "text-white" : "text-gray-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Trending
            </div>
            {activeTab === "trending" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
          </button>
          <button
            onClick={() => setActiveTab("creators")}
            className={`py-3 px-2 font-medium transition-all relative whitespace-nowrap ${
              activeTab === "creators" ? "text-white" : "text-gray-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Creators
            </div>
            {activeTab === "creators" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
          </button>
          <button
            onClick={() => setActiveTab("hashtags")}
            className={`py-3 px-2 font-medium transition-all relative whitespace-nowrap ${
              activeTab === "hashtags" ? "text-white" : "text-gray-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Hashtags
            </div>
            {activeTab === "hashtags" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {activeTab === "trending" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold">Trending Videos</h2>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[9/16] rounded-xl bg-neutral-900 animate-pulse" />
                ))}
              </div>
            ) : trendingVideos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">No trending videos found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {trendingVideos.map((video, index) => (
                  <div
                    key={video.id}
                    className="relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 cursor-pointer group"
                    onClick={() => router.push(`/video/${video.originalId || video.id}`)}
                  >
                    <img
                      src={video.thumbnail || "/placeholder.svg"}
                      alt={video.caption}
                      className="w-full h-full object-cover"
                    />

                    {/* Trending Badge */}
                    {index < 3 && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-white" />
                        <span className="text-white text-xs font-bold">#{index + 1}</span>
                      </div>
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                      <p className="text-white text-sm font-medium line-clamp-2">{video.caption}</p>
                      <p className="text-white/70 text-xs">{video.username}</p>
                      <div className="flex items-center gap-3 text-white text-xs">
                        <div className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {formatViews(video.views)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "creators" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Top Creators</h2>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-neutral-900/50 animate-pulse" />
                ))}
              </div>
            ) : topCreators.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">No creators found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topCreators.map((creator, index) => (
                  <div
                    key={creator.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 transition-all cursor-pointer border border-white/5"
                    onClick={() => router.push(`/?profile=${creator.username.replace('@', '')}`)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                          {creator.avatarUrl ? (
                            <img src={creator.avatarUrl} alt={creator.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            creator.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        {index < 3 && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-white font-semibold">@{creator.username}</span>
                          {creator.isVerified && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                        </div>
                        <p className="text-gray-400 text-sm mb-1">{creator.bio || "No bio"}</p>
                        <p className="text-gray-500 text-xs">
                          {creator.followersCount ? formatViews(creator.followersCount) : "0"} followers
                        </p>
                      </div>
                    </div>
                    <button 
                      className="px-6 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-all"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle follow logic
                      }}
                    >
                      {creator.isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "hashtags" && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-5 h-5 text-pink-400" />
              <h2 className="text-lg font-semibold">Trending Hashtags</h2>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-neutral-900/50 animate-pulse" />
                ))}
              </div>
            ) : trendingHashtags.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60">No trending hashtags found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trendingHashtags.map((hashtag, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 transition-all cursor-pointer border border-white/5"
                    onClick={() => router.push(`/hashtag/${hashtag.tag}`)}
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">#{hashtag.tag}</h3>
                      <p className="text-gray-400 text-sm">{hashtag.views} views</p>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                      <TrendingUp className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 text-xs font-semibold">Trending</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
