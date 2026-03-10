"use client"

import { useState, useRef } from "react"
import type React from "react"
import type { Video } from "@/types/video"
import { api } from "@/lib/api/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function useVideoInteractions(videos: Video[], isAuthenticated: boolean) {
  const router = useRouter()
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set())
  const [savedVideos, setSavedVideos] = useState<Set<number>>(new Set())
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set())
  const [doubleTapHearts, setDoubleTapHearts] = useState<{ [key: number]: boolean }>({})
  const lastTapRef = useRef<{ [key: number]: number }>({})
  const doubleTapTimeoutRef = useRef<{ [key: number]: NodeJS.Timeout }>({})

  const requireAuth = (callback: () => void) => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    callback()
  }

  const toggleLike = async (videoId: number) => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    const video = videos.find((v) => v.id === videoId)
    const videoIdStr = video?.originalId || String(videoId)
    const wasLiked = likedVideos.has(videoId)

    try {
      if (wasLiked) {
        await api.unlikeVideo(videoIdStr)
        setLikedVideos((prev) => {
          const newSet = new Set(prev)
          newSet.delete(videoId)
          return newSet
        })
        toast.info("Unliked")
      } else {
        await api.likeVideo(videoIdStr)
        setLikedVideos((prev) => {
          const newSet = new Set(prev)
          newSet.add(videoId)
          return newSet
        })
        toast.success("Liked", { description: "Added to your liked videos" })
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      toast.error("Failed to update like")
    }
  }

  const toggleSave = async (videoId: number) => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    const video = videos.find((v) => v.id === videoId)
    const videoIdStr = video?.originalId || String(videoId)
    const wasSaved = savedVideos.has(videoId)

    try {
      if (wasSaved) {
        await api.unsaveVideo(videoIdStr)
        setSavedVideos((prev) => {
          const newSet = new Set(prev)
          newSet.delete(videoId)
          return newSet
        })
        toast.info("Removed from favorites")
      } else {
        await api.saveVideo(videoIdStr)
        setSavedVideos((prev) => {
          const newSet = new Set(prev)
          newSet.add(videoId)
          return newSet
        })
        toast.success("Saved", { description: "Added to your favorites" })
      }
    } catch (error) {
      console.error("Error toggling save:", error)
      toast.error("Failed to update save")
    }
  }

  const toggleFollow = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    const wasFollowing = followedUsers.has(username)

    try {
      if (wasFollowing) {
        await api.unfollowUser(username)
        setFollowedUsers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(username)
          return newSet
        })
        toast.info(`Unfollowed ${username}`)
      } else {
        await api.followUser(username)
        setFollowedUsers((prev) => {
          const newSet = new Set(prev)
          newSet.add(username)
          return newSet
        })
        toast.success(`Following ${username}`, {
          description: "You'll see their videos in your feed",
        })
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast.error("Failed to update follow")
    }
  }

  const handleDoubleTap = (videoId: number) => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    const now = Date.now()
    const lastTap = lastTapRef.current[videoId] || 0
    const timeDiff = now - lastTap

    if (timeDiff < 300 && timeDiff > 0) {
      if (!likedVideos.has(videoId)) {
        toggleLike(videoId).catch((error) => {
          console.error("Error liking video on double tap:", error)
          setLikedVideos((prev) => {
            const newSet = new Set(prev)
            newSet.delete(videoId)
            return newSet
          })
        })
      }

      setDoubleTapHearts((prev) => ({ ...prev, [videoId]: true }))
      if (doubleTapTimeoutRef.current[videoId]) {
        clearTimeout(doubleTapTimeoutRef.current[videoId])
      }
      doubleTapTimeoutRef.current[videoId] = setTimeout(() => {
        setDoubleTapHearts((prev) => ({ ...prev, [videoId]: false }))
        delete doubleTapTimeoutRef.current[videoId]
      }, 1000)
    }

    lastTapRef.current[videoId] = now
  }

  return {
    likedVideos,
    savedVideos,
    followedUsers,
    doubleTapHearts,
    doubleTapTimeoutRef,
    requireAuth,
    toggleLike,
    toggleSave,
    toggleFollow,
    handleDoubleTap,
  }
}
