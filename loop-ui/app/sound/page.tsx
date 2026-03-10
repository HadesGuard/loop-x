"use client"

import { useState, useEffect, useTransition, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Music, Play, Search, TrendingUp, Loader2, X, Clock, Eye } from "lucide-react"
import { BottomNavigation } from "@/components/bottom-navigation"
import { api } from "@/lib/api/api"
import { formatViews } from "@/lib/format"
import { toast } from "sonner"

interface Sound {
  id: string
  title: string
  artist: string
  artistId?: string
  duration: number | null
  url: string | null
  thumbnail: string | null
  genre: string | null
  totalVideos: number
  totalViews: string
  isOriginal: boolean
  isFavorited?: boolean
  createdAt: string
}

interface Genre {
  id: string
  name: string
  soundCount: number
}

export default function SoundBrowsePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Sound[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Trending
  const [trendingSounds, setTrendingSounds] = useState<Sound[]>([])
  const [isTrendingLoading, setIsTrendingLoading] = useState(true)

  // Genres
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  // All sounds
  const [sounds, setSounds] = useState<Sound[]>([])
  const [isSoundsLoading, setIsSoundsLoading] = useState(true)
  const [pagination, setPagination] = useState<{ hasMore: boolean; page: number }>({ hasMore: false, page: 1 })
  const [sortBy, setSortBy] = useState<string>("trending")

  useEffect(() => {
    const authToken = localStorage.getItem("auth_token")
    setIsAuthenticated(!!authToken)
  }, [])

  // Load trending sounds and genres on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [trendingData, genreData] = await Promise.all([
          api.getTrendingSounds(10),
          api.getSoundGenres(),
        ])
        setTrendingSounds(trendingData.sounds)
        setGenres(genreData)
      } catch {
        toast.error("Failed to load sounds")
      } finally {
        setIsTrendingLoading(false)
      }
    }
    loadInitialData()
  }, [])

  // Load all sounds when genre or sort changes
  const loadSounds = useCallback(async (page = 1) => {
    try {
      setIsSoundsLoading(true)
      const data = await api.getSounds(page, 20, {
        sort: sortBy,
        genre: selectedGenre || undefined,
      })
      if (page === 1) {
        setSounds(data.sounds)
      } else {
        setSounds((prev) => [...prev, ...data.sounds])
      }
      setPagination({ hasMore: data.pagination.hasMore, page: data.pagination.page })
    } catch {
      toast.error("Failed to load sounds")
    } finally {
      setIsSoundsLoading(false)
    }
  }, [sortBy, selectedGenre])

  useEffect(() => {
    loadSounds(1)
  }, [loadSounds])

  // Search with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }
    if (!value.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await api.searchSounds(value, 1, 20)
        setSearchResults(data.sounds)
      } catch {
        toast.error("Search failed")
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }

  const handleLoadMore = () => {
    if (pagination.hasMore && !isSoundsLoading) {
      loadSounds(pagination.page + 1)
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

  const SoundCard = ({ sound, showIndex, index }: { sound: Sound; showIndex?: boolean; index?: number }) => (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/50 hover:bg-neutral-900 transition-all cursor-pointer border border-white/5"
      onClick={() => router.push(`/sound/${sound.id}`)}
    >
      <div className="relative w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {sound.thumbnail ? (
          <img src={sound.thumbnail} alt={sound.title} className="w-full h-full object-cover" />
        ) : (
          <Music className="w-7 h-7 text-white" />
        )}
        {showIndex && typeof index === "number" && index < 3 && (
          <div className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-white text-[10px] font-bold">
            {index + 1}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-sm truncate">{sound.title}</h3>
        <p className="text-gray-400 text-xs truncate">{sound.artist}</p>
        <div className="flex items-center gap-3 text-gray-500 text-xs mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(sound.duration)}
          </span>
          <span className="flex items-center gap-1">
            <Play className="w-3 h-3" />
            {formatViews(sound.totalVideos)}
          </span>
          {sound.genre && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px]">
              {sound.genre}
            </span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <Play className="w-4 h-4 text-white ml-0.5" />
        </div>
      </div>
    </div>
  )

  const isShowingSearch = searchQuery.trim().length > 0

  return (
    <div className="min-h-screen bg-black text-white animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center gap-4 px-4 py-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Music className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-bold">Sounds</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search sounds..."
              className="w-full pl-10 pr-10 py-2.5 rounded-full bg-white/10 text-white placeholder-gray-400 text-sm border border-white/10 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="pb-24">
        {/* Search Results */}
        {isShowingSearch ? (
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              Results for &ldquo;{searchQuery}&rdquo;
            </h2>
            {isSearching ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Music className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/60">No sounds found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((sound) => (
                  <SoundCard key={sound.id} sound={sound} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Trending Sounds */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <h2 className="text-lg font-semibold">Trending Sounds</h2>
              </div>
              {isTrendingLoading ? (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-shrink-0 w-40 h-48 rounded-xl bg-neutral-900 animate-pulse" />
                  ))}
                </div>
              ) : trendingSounds.length === 0 ? (
                <p className="text-white/40 text-sm">No trending sounds right now</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {trendingSounds.map((sound, index) => (
                    <div
                      key={sound.id}
                      className="flex-shrink-0 w-40 rounded-xl bg-neutral-900/80 border border-white/5 overflow-hidden cursor-pointer hover:border-purple-500/30 transition-all"
                      onClick={() => router.push(`/sound/${sound.id}`)}
                    >
                      <div className="relative w-full h-28 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {sound.thumbnail ? (
                          <img src={sound.thumbnail} alt={sound.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-10 h-10 text-white/80" />
                        )}
                        {index < 3 && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full">
                            <span className="text-white text-xs font-bold">#{index + 1}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="p-2.5">
                        <h3 className="text-white text-sm font-semibold truncate">{sound.title}</h3>
                        <p className="text-gray-400 text-xs truncate">{sound.artist}</p>
                        <p className="text-gray-500 text-[10px] mt-1 flex items-center gap-1">
                          <Play className="w-2.5 h-2.5" />
                          {formatViews(sound.totalVideos)} videos
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Genre Filter Tabs */}
            {genres.length > 0 && (
              <div className="px-4 py-3 border-b border-white/5">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedGenre === null
                        ? "bg-white text-black"
                        : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                    }`}
                  >
                    All
                  </button>
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => setSelectedGenre(genre.id === selectedGenre ? null : genre.id)}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                        selectedGenre === genre.id
                          ? "bg-white text-black"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                      }`}
                    >
                      {genre.name} ({genre.soundCount})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sort Options */}
            <div className="px-4 py-3 flex gap-2">
              {[
                { value: "trending", label: "Trending" },
                { value: "recent", label: "Recent" },
                { value: "popular", label: "Popular" },
                { value: "alphabetical", label: "A-Z" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    sortBy === option.value
                      ? "bg-purple-500 text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* All Sounds Grid */}
            <div className="px-4">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold">Browse Sounds</h2>
              </div>
              {isSoundsLoading && sounds.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-neutral-900/50 animate-pulse" />
                  ))}
                </div>
              ) : sounds.length === 0 ? (
                <div className="text-center py-12">
                  <Music className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60">No sounds found</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {sounds.map((sound, index) => (
                      <SoundCard key={sound.id} sound={sound} showIndex={sortBy === "trending"} index={index} />
                    ))}
                  </div>

                  {/* Load More */}
                  {pagination.hasMore && (
                    <div className="flex justify-center mt-6 mb-4">
                      <button
                        onClick={handleLoadMore}
                        disabled={isSoundsLoading}
                        className="px-8 py-3 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition-all disabled:opacity-50 border border-white/10"
                      >
                        {isSoundsLoading ? (
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
