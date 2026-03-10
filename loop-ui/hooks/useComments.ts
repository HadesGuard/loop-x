"use client"

import { useState } from "react"
import type { Video, Comment } from "@/types/video"
import { api } from "@/lib/api/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function useComments(videos: Video[], isAuthenticated: boolean, currentUser: string | null) {
  const router = useRouter()
  const [showComments, setShowComments] = useState(false)
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set())
  const [replyingTo, setReplyingTo] = useState<number | null>(null)

  const openComments = async (videoId: number) => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    setCurrentVideoId(videoId)
    setShowComments(true)
    try {
      const video = videos.find((v) => v.id === videoId)
      const videoIdStr = video?.originalId || String(videoId)
      const videoComments = await api.getComments(videoIdStr)
      setComments(videoComments)
    } catch (error) {
      console.error("Error loading comments:", error)
      setComments([])
    }
  }

  const closeComments = () => {
    setShowComments(false)
    setNewComment("")
    setReplyingTo(null)
  }

  const addReply = async (commentId: number, replyText: string) => {
    if (!currentUser || !currentVideoId) return

    try {
      const comment = comments.find((c) => c.id === commentId)
      const parentId = comment?.originalId || String(commentId)
      const video = videos.find((v) => v.id === currentVideoId)
      const videoId = video?.originalId || String(currentVideoId)

      const reply = await api.addComment(videoId, replyText, parentId)
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return { ...c, replies: [...(c.replies || []), reply] }
          }
          return c
        }),
      )
      setReplyingTo(null)
      setNewComment("")
    } catch (error) {
      console.error("Error adding reply:", error)
      toast.error("Failed to add reply")
    }
  }

  const addComment = async () => {
    if (!newComment.trim() || !currentVideoId) return

    if (replyingTo !== null) {
      const replyText = newComment.replace(/^@\w+\s*/, "").trim()
      if (!replyText) return
      await addReply(replyingTo, replyText)
      return
    }

    try {
      const video = videos.find((v) => v.id === currentVideoId)
      const videoId = video?.originalId || String(currentVideoId)
      const comment = await api.addComment(videoId, newComment)
      setComments((prev) => [comment, ...prev])
      setNewComment("")
    } catch (error) {
      console.error("Error adding comment:", error)
      toast.error("Failed to add comment")
    }
  }

  const toggleCommentLike = async (commentId: number) => {
    try {
      const commentIdStr = String(commentId)
      const isLiked = likedComments.has(commentId)
      if (isLiked) {
        await api.unlikeComment(commentIdStr)
      } else {
        await api.likeComment(commentIdStr)
      }
      setLikedComments((prev) => {
        const newSet = new Set(prev)
        if (isLiked) {
          newSet.delete(commentId)
        } else {
          newSet.add(commentId)
        }
        return newSet
      })
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, likes: isLiked ? Math.max(0, comment.likes - 1) : comment.likes + 1 }
            : comment,
        ),
      )
    } catch (error) {
      console.error("Error toggling comment like:", error)
    }
  }

  return {
    showComments,
    currentVideoId,
    comments,
    newComment,
    setNewComment,
    likedComments,
    replyingTo,
    setReplyingTo,
    openComments,
    closeComments,
    addComment,
    toggleCommentLike,
  }
}
