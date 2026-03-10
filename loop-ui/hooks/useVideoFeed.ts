"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Video } from "@/types/video"
import { api } from "@/lib/api/api"
import { videoCache } from "@/lib/video-cache"
import { toast } from "sonner"

export function useVideoFeed(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [videos, setVideos] = useState<Video[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [feedType, setFeedType] = useState<"foryou" | "following">("foryou")

  const hasLoadedRef = useRef<string | null>(null)
  const isLoadingMoreRef = useRef(false)
  const cleanupRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load initial videos on mount with cache support
  useEffect(() => {
    if (hasLoadedRef.current === feedType) return

    const loadVideos = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (!token) {
        setIsLoading(false)
        setVideos([])
        return
      }

      try {
        setIsLoading(true)
        const cached = videoCache.load(feedType)
        if (cached && cached.videos.length > 0) {
          setVideos(cached.videos)
          const timer = setTimeout(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = cached.scrollPosition
            }
          }, 100)
          cleanupRef.current = timer
          setIsLoading(false)
          hasLoadedRef.current = feedType
        } else {
          const newVideos = await api.getVideosFeed(feedType, 1, 10)
          setVideos(newVideos)
          if (newVideos.length > 0) {
            videoCache.save(feedType, newVideos, 0)
          }
          setIsLoading(false)
          hasLoadedRef.current = feedType
        }
      } catch (error) {
        console.error("Error loading videos:", error)
        setIsLoading(false)
        const cached = videoCache.load(feedType)
        if (cached && cached.videos.length > 0) {
          setVideos(cached.videos)
          hasLoadedRef.current = feedType
        } else {
          setVideos([])
          const errorMessage = error instanceof Error ? error.message : ""
          if (!errorMessage.includes("Unauthorized")) {
            toast.error("Failed to load videos", {
              description: "Please try refreshing the page",
            })
          }
        }
      }
    }

    loadVideos()
    return () => {
      if (cleanupRef.current) clearTimeout(cleanupRef.current)
    }
  }, [feedType, containerRef])

  // Save videos to cache whenever they change
  useEffect(() => {
    if (videos.length > 0 && containerRef.current) {
      const scrollTop = containerRef.current.scrollTop
      videoCache.save(feedType, videos, scrollTop)
    }
  }, [videos, feedType, containerRef])

  const loadMoreVideos = useCallback(async () => {
    if (isLoading || isLoadingMoreRef.current) return

    isLoadingMoreRef.current = true
    setIsLoading(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      if (!token) return

      const page = Math.floor(videos.length / 10) + 1
      const newVideos = await api.getVideosFeed(feedType, page, 10)
      setVideos((prev) => {
        const existingIds = new Set(prev.map((v) => v.id))
        const uniqueNewVideos = newVideos.filter((v) => !existingIds.has(v.id))
        const updated = [...prev, ...uniqueNewVideos]
        if (containerRef.current) {
          videoCache.save(feedType, updated, containerRef.current.scrollTop)
        }
        return updated
      })
    } catch (error) {
      console.error("Error loading more videos:", error)
    } finally {
      setIsLoading(false)
      isLoadingMoreRef.current = false
    }
  }, [isLoading, videos.length, feedType, containerRef])

  return {
    videos,
    setVideos,
    isLoading,
    feedType,
    setFeedType,
    loadMoreVideos,
    isLoadingMoreRef,
  }
}
