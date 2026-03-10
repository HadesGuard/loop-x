"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  TrendingDown,
  Clock,
  Play,
  Download,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react"
import { api } from "@/lib/api/api"

export default function VideoAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const videoId = params.id as string

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d")
  const [loading, setLoading] = useState(true)
  const [videoInfo, setVideoInfo] = useState<{
    title: string
    thumbnail: string
    duration: string
    uploadDate: string
  } | null>(null)
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    avgWatchTime: "0:00",
    completionRate: 0,
    engagement: 0,
  })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [video, analyticsResponse] = await Promise.all([
          api.getVideoById(videoId),
          api.getVideoAnalytics(videoId),
        ])

        if (video) {
          setVideoInfo({
            title: video.caption || "Untitled",
            thumbnail: video.thumbnail || "",
            duration: "—",
            uploadDate: "—",
          })
        }

        if (analyticsResponse) {
          setStats({
            totalViews: analyticsResponse.totalViews || analyticsResponse.views || 0,
            totalLikes: analyticsResponse.totalLikes || analyticsResponse.likesCount || 0,
            totalComments: analyticsResponse.totalComments || analyticsResponse.commentsCount || 0,
            totalShares: analyticsResponse.totalShares || analyticsResponse.sharesCount || 0,
            avgWatchTime: analyticsResponse.avgWatchTime || "—",
            completionRate: analyticsResponse.completionRate || 0,
            engagement: analyticsResponse.engagement || 0,
          })
        }
      } catch {
        // Failed to load analytics
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [videoId])

  // Mock data for sections backend doesn't support yet
  const audienceRetention = [
    { time: 0, retention: 100 },
    { time: 10, retention: 95 },
    { time: 20, retention: 88 },
    { time: 30, retention: 82 },
    { time: 40, retention: 78 },
    { time: 50, retention: 72 },
    { time: 60, retention: 68 },
    { time: 70, retention: 62 },
    { time: 80, retention: 55 },
    { time: 90, retention: 48 },
    { time: 100, retention: 42 },
  ]

  const demographics = {
    age: [
      { range: "13-17", percentage: 12 },
      { range: "18-24", percentage: 35 },
      { range: "25-34", percentage: 28 },
      { range: "35-44", percentage: 15 },
      { range: "45+", percentage: 10 },
    ],
    topCountries: [
      { country: "United States", percentage: 35, views: Math.round(stats.totalViews * 0.35) },
      { country: "United Kingdom", percentage: 18, views: Math.round(stats.totalViews * 0.18) },
      { country: "Canada", percentage: 12, views: Math.round(stats.totalViews * 0.12) },
      { country: "Australia", percentage: 8, views: Math.round(stats.totalViews * 0.08) },
      { country: "Germany", percentage: 6, views: Math.round(stats.totalViews * 0.06) },
    ],
  }

  const trafficSources = [
    { source: "For You Feed", percentage: 45 },
    { source: "Following Feed", percentage: 25 },
    { source: "Search", percentage: 15 },
    { source: "Direct Link", percentage: 10 },
    { source: "External", percentage: 5 },
  ]

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    change,
    changeLabel,
  }: {
    icon: React.ComponentType<{ className?: string }>
    label: string
    value: string | number
    change?: number
    changeLabel?: string
  }) => (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span>
              {change >= 0 ? "+" : ""}
              {change}%
            </span>
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-white/60 text-sm">{label}</div>
      {changeLabel && <div className="text-white/40 text-xs mt-1">{changeLabel}</div>}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/studio")}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">Video Analytics</h1>
                <p className="text-white/60 text-sm">Detailed performance insights</p>
              </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2">
              {(["7d", "30d", "90d", "all"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeRange === range
                      ? "bg-white text-black"
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {range === "all" ? "All Time" : range.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Video Info */}
        {videoInfo && (
          <div className="mb-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-start gap-6">
              <div className="relative w-80 h-48 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                <img
                  src={videoInfo.thumbnail || "/placeholder.svg"}
                  alt={videoInfo.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-sm font-semibold">
                  {videoInfo.duration}
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{videoInfo.title}</h2>
                <p className="text-white/60 text-sm mb-4">Uploaded {videoInfo.uploadDate}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/studio/edit/${videoId}`)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-all flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-all flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-red-400 font-medium transition-all flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard icon={Eye} label="Total Views" value={formatNumber(stats.totalViews)} />
          <StatCard icon={Heart} label="Total Likes" value={formatNumber(stats.totalLikes)} />
          <StatCard icon={MessageCircle} label="Total Comments" value={stats.totalComments} />
          <StatCard icon={Share2} label="Total Shares" value={stats.totalShares} />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard icon={Clock} label="Avg Watch Time" value={stats.avgWatchTime} />
          <StatCard icon={Play} label="Completion Rate" value={stats.completionRate ? `${stats.completionRate}%` : "—"} />
          <StatCard icon={TrendingUp} label="Engagement Rate" value={stats.engagement ? `${stats.engagement}%` : "—"} />
        </div>

        {/* Audience Retention */}
        <div className="mb-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6">Audience Retention</h3>
          <div className="relative h-64">
            <svg className="w-full h-full">
              <defs>
                <linearGradient id="retentionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={`${100 - y}%`}
                  x2="100%"
                  y2={`${100 - y}%`}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              ))}
              <polyline
                points={audienceRetention
                  .map(
                    (point, i) => `${(i / (audienceRetention.length - 1)) * 100}%,${100 - point.retention}%`,
                  )
                  .join(" ")}
                fill="url(#retentionGradient)"
                stroke="#3b82f6"
                strokeWidth="2"
              />
            </svg>
            <div className="absolute top-0 left-0 right-0 flex justify-between text-white/40 text-xs">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-white/40 text-xs mt-2">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
          <p className="text-white/60 text-sm text-center mt-4">
            Your video maintains {audienceRetention[audienceRetention.length - 1].retention}% of viewers until the end
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Demographics - Age */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-6">Age Demographics</h3>
            <div className="space-y-4">
              {demographics.age.map((item) => (
                <div key={item.range}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80">{item.range}</span>
                    <span className="text-white font-semibold">{item.percentage}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-6">Traffic Sources</h3>
            <div className="space-y-4">
              {trafficSources.map((source) => (
                <div key={source.source}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80">{source.source}</span>
                    <span className="text-white font-semibold">{source.percentage}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-6">Top Countries</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">Country</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">Views</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">Percentage</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/60">Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {demographics.topCountries.map((country, index) => (
                  <tr key={index} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 text-white font-medium">{country.country}</td>
                    <td className="px-4 py-4 text-white/80">{formatNumber(country.views)}</td>
                    <td className="px-4 py-4 text-white/80">{country.percentage}%</td>
                    <td className="px-4 py-4">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden w-full">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          style={{ width: `${country.percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
