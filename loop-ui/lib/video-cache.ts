import type { Video } from "@/types/video"

const CACHE_KEY_PREFIX = "video_feed_cache_"
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 minutes

interface VideoCache {
  videos: Video[]
  feedType: "foryou" | "following"
  timestamp: number
  scrollPosition: number
}

export const videoCache = {
  // Save videos to cache
  save(feedType: "foryou" | "following", videos: Video[], scrollPosition: number = 0) {
    if (typeof window === "undefined") return

    const cache: VideoCache = {
      videos,
      feedType,
      timestamp: Date.now(),
      scrollPosition,
    }

    try {
      sessionStorage.setItem(`${CACHE_KEY_PREFIX}${feedType}`, JSON.stringify(cache))
    } catch (error) {
      console.warn("Failed to save video cache:", error)
    }
  },

  // Load videos from cache
  load(feedType: "foryou" | "following"): { videos: Video[]; scrollPosition: number } | null {
    if (typeof window === "undefined") return null

    try {
      const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${feedType}`)
      if (!cached) return null

      const cache: VideoCache = JSON.parse(cached)

      // Check if cache is expired
      if (Date.now() - cache.timestamp > CACHE_EXPIRY) {
        this.clear(feedType)
        return null
      }

      // Check if feedType matches
      if (cache.feedType !== feedType) {
        return null
      }

      return {
        videos: cache.videos,
        scrollPosition: cache.scrollPosition,
      }
    } catch (error) {
      console.warn("Failed to load video cache:", error)
      return null
    }
  },

  // Clear cache for a specific feed type
  clear(feedType?: "foryou" | "following") {
    if (typeof window === "undefined") return

    try {
      if (feedType) {
        sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${feedType}`)
      } else {
        // Clear all video caches
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith(CACHE_KEY_PREFIX)) {
            sessionStorage.removeItem(key)
          }
        })
      }
    } catch (error) {
      console.warn("Failed to clear video cache:", error)
    }
  },

  // Check if cache exists and is valid
  has(feedType: "foryou" | "following"): boolean {
    return this.load(feedType) !== null
  },
}


