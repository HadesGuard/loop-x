"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Flag,
  User,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react"
import { api } from "@/lib/api/api"
import type { Video, Comment } from "@/types/video"
import { formatViews } from "@/lib/format"
import { CommentModal } from "@/components/comment-modal"
import { ShareModal } from "@/components/modals/share-modal"
import { ReportModal } from "@/components/modals/report-modal"
import { BottomNavigation } from "@/components/bottom-navigation"
import { toast } from "sonner"

export default function VideoDetailPage() {
  const router = useRouter()
  const params = useParams()
  const videoId = params.id as string // Backend uses string UUIDs
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [video, setVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set())
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const authToken = localStorage.getItem("auth_token")
    setIsAuthenticated(!!authToken)
  }, [])

  // Load video
  useEffect(() => {
    const loadVideo = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const videoData = await api.getVideoById(videoId)
        if (!videoData) {
          setError("Video not found")
          return
        }
        setVideo(videoData)
        // Track view
        await api.trackView(videoId).catch(err => console.error("Error tracking view:", err))
      } catch (err) {
        setError("Failed to load video. Please try again.")
        console.error("Error loading video:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (videoId) {
      loadVideo()
    }
  }, [videoId])

  // Load comments
  useEffect(() => {
    if (video) {
      const videoIdStr = video.originalId || String(video.id)
      api.getComments(videoIdStr).then(setComments).catch(err => {
        console.error("Error loading comments:", err)
        setComments([])
      })
    }
  }, [video])

  // Auto-play video when loaded
  useEffect(() => {
    if (videoRef.current && video && !isLoading) {
      videoRef.current.muted = isMuted
      videoRef.current.play().catch((err) => {
        console.log("Autoplay prevented:", err)
      })
      setIsPlaying(true)
    }
  }, [video, isLoading, isMuted])

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
        setIsPlaying(true)
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleLike = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    const wasLiked = isLiked
    setIsLiked(!wasLiked)
    if (!wasLiked) {
      toast.success("Liked", {
        description: "Added to your liked videos",
      })
    } else {
      toast.info("Unliked")
    }
  }

  const handleSave = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    const wasSaved = isSaved
    setIsSaved(!wasSaved)
    if (!wasSaved) {
      toast.success("Saved", {
        description: "Added to your favorites",
      })
    } else {
      toast.info("Removed from favorites")
    }
  }

  const handleComment = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    setShowComments(true)
  }

  const handleShare = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    setShowShareModal(true)
  }

  const addComment = async () => {
    if (!newComment.trim() || !video) return

    try {
      const videoIdStr = video.originalId || String(video.id)
      const comment = await api.addComment(videoIdStr, newComment)
      setComments((prev) => [comment, ...prev])
      setNewComment("")
      toast.success("Comment added")
    } catch (err) {
      console.error("Error adding comment:", err)
      toast.error("Failed to add comment", {
        description: "Please try again",
      })
    }
  }

  const toggleCommentLike = async (commentId: number) => {
    try {
      // Find comment to get original ID - for now using string conversion
      const commentIdStr = String(commentId)
      const isLiked = likedComments.has(commentId)
      if (isLiked) {
        await api.unlikeComment(commentIdStr)
      } else {
        await api.likeComment(commentIdStr)
      }
      const result = { liked: !isLiked, likes: 0 } // Backend doesn't return updated count
      setLikedComments((prev) => {
        const newSet = new Set(prev)
        if (result.liked) {
          newSet.add(commentId)
        } else {
          newSet.delete(commentId)
        }
        return newSet
      })
      setComments((prev) =>
        prev.map((comment) => (comment.id === commentId ? { ...comment, likes: result.likes } : comment)),
      )
    } catch (err) {
      console.error("Error toggling comment like:", err)
      toast.error("Failed to update comment like", {
        description: err instanceof Error ? err.message : "Please try again",
      })
      // Revert UI state on error
      setLikedComments((prev) => {
        const newSet = new Set(prev)
        if (isLiked) {
          newSet.add(commentId)
        } else {
          newSet.delete(commentId)
        }
        return newSet
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Video Not Found</h1>
          <p className="text-white/60 mb-6">{error || "The video you're looking for doesn't exist."}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-4 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">Video</h1>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative w-full aspect-[9/16] max-w-md mx-auto bg-black">
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-contain"
          loop
          playsInline
          onClick={togglePlayPause}
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <button
              onClick={togglePlayPause}
              className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-all"
            >
              <Play className="w-8 h-8 text-white" />
            </button>
          </div>
        )}

        {/* Video Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <button
            onClick={toggleMute}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-black/70 transition-all"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Video Info */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/?profile=${video.username}`)}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold"
          >
            {video.username[1]?.toUpperCase() || "U"}
          </button>
          <div className="flex-1">
            <button
              onClick={() => router.push(`/?profile=${video.username}`)}
              className="font-semibold hover:underline"
            >
              {video.username}
            </button>
            <p className="text-white/60 text-sm">{formatViews(video.views)} views</p>
          </div>
          <button className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-gray-200 transition-all">
            Follow
          </button>
        </div>

        {/* Caption */}
    <div>
          <p className="text-white">
            <span className="font-semibold">{video.username}</span> {video.caption}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1"
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart className={`w-6 h-6 ${isLiked ? "fill-red-500 text-red-500" : "text-white"}`} />
            <span className="text-xs text-white/60">Like</span>
          </button>

          <button onClick={handleComment} className="flex flex-col items-center gap-1" aria-label="Comment">
            <MessageCircle className="w-6 h-6 text-white" />
            <span className="text-xs text-white/60">Comment</span>
          </button>

          <button onClick={handleSave} className="flex flex-col items-center gap-1" aria-label={isSaved ? "Unsave" : "Save"}>
            <Bookmark className={`w-6 h-6 ${isSaved ? "fill-yellow-500 text-yellow-500" : "text-white"}`} />
            <span className="text-xs text-white/60">Save</span>
          </button>

          <button onClick={handleShare} className="flex flex-col items-center gap-1" aria-label="Share">
            <Share2 className="w-6 h-6 text-white" />
            <span className="text-xs text-white/60">Share</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="flex flex-col items-center gap-1"
              aria-label="More options"
            >
              <MoreHorizontal className="w-6 h-6 text-white" />
            </button>

      {showMoreMenu && (
        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl bg-white/95 backdrop-blur-md p-2 shadow-xl">
          <button
            onClick={() => {
              setShowMoreMenu(false)
              setShowReportModal(true)
            }}
            className="flex items-center w-full gap-3 px-3 py-2 text-sm text-left text-black transition-colors rounded-lg hover:bg-black/5"
          >
            <Flag className="w-4 h-4" />
            Report
          </button>
        </div>
      )}
          </div>
        </div>
      </div>

      {/* Comments Modal */}
      <CommentModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        comments={comments}
        newComment={newComment}
        onNewCommentChange={setNewComment}
        onAddComment={addComment}
        onLikeComment={toggleCommentLike}
        likedComments={likedComments}
        onReply={(commentId, username) => {
          setReplyingTo(commentId)
          setNewComment(`@${username} `)
        }}
        replyingTo={replyingTo}
        onCancelReply={() => {
          setReplyingTo(null)
          setNewComment("")
        }}
      />

      {/* Share Modal */}
      <ShareModal isOpen={showShareModal} videoId={video.id} onClose={() => setShowShareModal(false)} />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        reportTarget={{ type: "video", identifier: video.id }}
        onClose={() => setShowReportModal(false)}
        onReport={(reason) => {
          console.log(`Reporting video ${video.id} for: ${reason}`)
          setShowReportModal(false)
          toast.success("Report submitted", {
            description: "Thank you for helping keep our community safe.",
          })
        }}
      />

      {/* Bottom Navigation */}
      <BottomNavigation
        currentPage="home"
        onNavigate={(page) => {
          if (page === "profile") {
            router.push("/")
          } else {
            router.push(page)
          }
        }}
        isAuthenticated={isAuthenticated}
        unreadCount={0}
      />
    </div>
  )
}
