"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BottomNavigation } from "@/components/bottom-navigation"
import {
  ArrowLeft,
  BarChart3,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Video as VideoIcon,
  Users,
  Clock,
  Edit,
  Trash2,
  MoreVertical,
  Download,
  Plus,
} from "lucide-react"
import { api } from "@/lib/api/api"
import type { Video } from "@/types/video"
import { formatViews } from "@/lib/format"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"

interface VideoStats {
  id: string
  originalId?: string
  title: string
  thumbnail: string | null
  views: number
  likes: number
  comments: number
  shares: number
  uploadDate: string
  duration: number | null
}

export default function CreatorStudioPage() {
  const router = useRouter()
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [totalStats, setTotalStats] = useState({
    totalViews: 0,
    totalFollowers: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalVideos: 0,
    avgEngagement: 0,
    weeklyGrowth: 0,
    watchHours: 0,
  })
  const [videos, setVideos] = useState<VideoStats[]>([])

  useEffect(() => {
    const authToken = localStorage.getItem("auth_token")
    setIsAuthenticated(!!authToken)
    
    if (authToken) {
      loadData()
    } else {
      setIsLoading(false)
    }
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [analytics, myVideos] = await Promise.all([
        api.getAnalyticsOverview().catch(() => ({
          totalViews: 0,
          totalFollowers: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalVideos: 0,
          avgEngagement: 0,
          weeklyGrowth: 0,
          watchHours: 0,
        })),
        api.getMyVideos(1, 50).catch(() => []),
      ])
      
      setTotalStats(analytics)
      
      // Transform videos to VideoStats format
      const videoStats: VideoStats[] = myVideos.map((video) => ({
        id: video.id.toString(),
        originalId: video.originalId,
        title: video.caption || "Untitled",
        thumbnail: video.thumbnail || null,
        views: video.views,
        likes: video.likes,
        comments: video.commentsCount,
        shares: video.sharesCount,
        uploadDate: video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) : "Recently",
        duration: video.duration,
      }))
      
      setVideos(videoStats)
    } catch (error) {
      console.error("Error loading studio data:", error)
      toast.error("Failed to load studio data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationClick = () => {
    startTransition(() => {
      router.push("/inbox")
    })
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Creator Studio</h1>
                <p className="text-white/60 text-sm">Manage your content and analytics</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/studio/upload")}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 transition-all font-semibold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Upload Video
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+{totalStats.weeklyGrowth}%</span>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatNumber(totalStats.totalViews)}</div>
            <div className="text-white/60 text-sm">Total Views</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+8.2%</span>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatNumber(totalStats.totalFollowers)}</div>
            <div className="text-white/60 text-sm">Followers</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Heart className="w-6 h-6 text-pink-400" />
              </div>
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+15.4%</span>
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatNumber(totalStats.totalLikes)}</div>
            <div className="text-white/60 text-sm">Total Likes</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <VideoIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalStats.totalVideos}</div>
              <div className="text-white/60 text-sm">Videos</div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalStats.avgEngagement}%</div>
              <div className="text-white/60 text-sm">Avg Engagement</div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">{formatNumber(Math.round(totalStats.watchHours))}</div>
              <div className="text-white/60 text-sm">Watch Hours</div>
            </div>
          </div>
        </div>

        {/* Videos Table */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-bold">Your Videos</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-sm">Loading videos...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="p-8 text-center">
              <VideoIcon className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 text-sm mb-4">No videos yet</p>
              <button
                onClick={() => router.push("/studio/upload")}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 transition-all font-semibold"
              >
                Upload Your First Video
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white/60">Video</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white/60">Views</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white/60">Likes</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white/60">Comments</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white/60">Shares</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white/60">Uploaded</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white/60">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                          <img
                            src={video.thumbnail || "/placeholder.svg"}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                          {video.duration && (
                            <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs font-semibold">
                              {formatDuration(video.duration)}
                            </div>
                          )}
                        </div>
                        <div className="max-w-xs">
                          <p className="text-white font-medium line-clamp-2 text-sm">{video.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-white/40" />
                        <span className="font-semibold">{formatViews(video.views)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-white/40" />
                        <span className="font-semibold">{formatNumber(video.likes)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-white/40" />
                        <span className="font-semibold">{formatNumber(video.comments)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-white/40" />
                        <span className="font-semibold">{formatNumber(video.shares)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/60 text-sm">{video.uploadDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/studio/analytics/${video.originalId || video.id}`)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                          title="View Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/studio/edit/${video.originalId || video.id}`)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                          title="Edit Video"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center transition-all group">
                          <Trash2 className="w-4 h-4 group-hover:text-red-400" />
                        </button>
                        <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        currentPage="upload"
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
