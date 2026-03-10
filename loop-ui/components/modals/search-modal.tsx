"use client"

import { X, Search, Hash, Play } from "lucide-react"
import { useState, useEffect } from "react"
import type { SearchResults } from "@/types/video"
import { formatViews } from "@/lib/format"
import { api } from "@/lib/api/api"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onProfileSelect: (username: string) => void
}

export function SearchModal({ isOpen, onClose, onProfileSelect }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchTab, setSearchTab] = useState<"all" | "users" | "videos" | "hashtags">("all")
  const [searchResults, setSearchResults] = useState<SearchResults>({
    users: [],
    videos: [],
    hashtags: [],
  })

  // Load search results when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      api.search(searchQuery, searchTab === 'all' ? undefined : searchTab).then((results) => {
        // Transform search results to match frontend types
        setSearchResults({
          users: results.users.map(u => ({
            id: parseInt(u.id.slice(0, 8), 16) || 0, // Convert UUID to number
            username: u.username,
            avatar: u.avatarUrl || '',
            followers: u.followersCount?.toString() || '0',
            isVerified: u.isVerified,
          })),
          videos: results.videos.map(v => ({
            id: parseInt(v.id.slice(0, 8), 16) || 0,
            originalId: v.id,
            url: v.url,
            username: v.user?.username || 'unknown',
            caption: v.description || v.title || '',
            views: v.views || 0,
            likes: v.likesCount || 0,
            commentsCount: v.commentsCount || 0,
            thumbnail: v.thumbnailUrl ?? undefined,
          })),
          hashtags: results.hashtags.map(h => ({
            tag: h.tag,
            views: h.views,
          })),
        })
      }).catch(err => {
        console.error("Error searching:", err)
        setSearchResults({ users: [], videos: [], hashtags: [] })
      })
    } else {
      setSearchResults({ users: [], videos: [], hashtags: [] })
    }
  }, [searchQuery, searchTab])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md">
      <div className="h-full flex flex-col">
        {/* Header with search */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos, users, hashtags..."
                className="w-full bg-white/10 border border-white/20 rounded-full pl-11 pr-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                autoFocus
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {["all", "users", "videos", "hashtags"].map((tab) => (
              <button
                key={tab}
                onClick={() => setSearchTab(tab as typeof searchTab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  searchTab === tab ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {(searchTab === "all" || searchTab === "users") && searchResults.users.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Users</h3>
              <div className="space-y-2">
                {searchResults.users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onProfileSelect(user.username)
                      onClose()
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {user.avatar}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">@{user.username}</span>
                        {user.isVerified && (
                          <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                      <span className="text-white/60 text-sm">{user.followers} followers</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(searchTab === "all" || searchTab === "videos") && searchResults.videos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3">Videos</h3>
              <div className="grid grid-cols-3 gap-2">
                {searchResults.videos.map((video) => (
                  <button
                    key={video.id}
                    className="relative aspect-[9/16] rounded-lg overflow-hidden bg-neutral-800 hover:ring-2 hover:ring-white/30 transition-all"
                  >
                    <img
                      src={video.thumbnail || "/placeholder.svg"}
                      alt={video.caption}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
                      <Play className="w-3 h-3" />
                      {formatViews(video.views)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(searchTab === "all" || searchTab === "hashtags") && searchResults.hashtags.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-3">Hashtags</h3>
              <div className="space-y-2">
                {searchResults.hashtags.map((hashtag) => (
                  <button
                    key={hashtag.tag}
                    className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                      <Hash className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-white font-medium">#{hashtag.tag}</div>
                      <div className="text-white/60 text-sm">{hashtag.views} views</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
