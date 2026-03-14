"use client"

import type React from "react"
import { useEffect, useRef, useState, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api/api"
import { VideoFeedHeader } from "@/components/video-feed-header"
import { VideoItemInline } from "@/components/video-item-inline"
import { CommentModal } from "@/components/comment-modal"
import { SearchModal } from "@/components/modals/search-modal"
import { ShareModal } from "@/components/modals/share-modal"
import { ReportModal } from "@/components/modals/report-modal"
import { NotificationModal } from "@/components/modals/notification-modal"
import { ProfileModalLoader } from "@/components/modals/profile-modal-loader"
import { BottomNavigation } from "@/components/bottom-navigation"
import { videoCache } from "@/lib/video-cache"
import { toast } from "sonner"
import { useWebSocket } from "@/hooks/useWebSocket"
import { useVideoFeed } from "@/hooks/useVideoFeed"
import { useVideoInteractions } from "@/hooks/useVideoInteractions"
import { useComments } from "@/hooks/useComments"
import { useMessages } from "@/hooks/useMessages"
import { useNotifications } from "@/hooks/useNotifications"

export default function VideoFeedPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)
  const scrollObserverRef = useRef<IntersectionObserver | null>(null)
  const loadingTriggerRef = useRef<HTMLDivElement | null>(null)

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<string | null>(null)

  useEffect(() => {
    const authToken = localStorage.getItem("auth_token")
    setIsAuthenticated(!!authToken)
  }, [])

  useEffect(() => {
    const userData = localStorage.getItem("user_data")
    if (userData) {
      try {
        const user = JSON.parse(userData)
        setCurrentUser(user.username || null)
      } catch {
        setCurrentUser(null)
      }
    }
  }, [])

  // Hooks
  const { videos, setVideos, isLoading, feedType, setFeedType, loadMoreVideos, isLoadingMoreRef } =
    useVideoFeed(containerRef)

  const {
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
  } = useVideoInteractions(videos, isAuthenticated)

  const {
    showComments,
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
  } = useComments(videos, isAuthenticated, currentUser)

  const {
    conversations,
    messages,
    selectedConversation,
    setSelectedConversation,
    messageInput,
    setMessageInput,
    sendMessage,
    handleIncomingMessage,
  } = useMessages()

  const {
    showNotifications,
    setShowNotifications,
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    handleIncomingNotification,
  } = useNotifications()

  // WebSocket
  useWebSocket({
    enabled: isAuthenticated,
    onNotification: (notification) => {
      handleIncomingNotification(notification)
      if (!notification.read) {
        toast.info(notification.action, {
          description: `${notification.username} ${notification.action}`,
        })
      }
    },
    onMessage: handleIncomingMessage,
  })

  // UI state
  const [isMuted, setIsMuted] = useState(true)
  const [videoProgress, setVideoProgress] = useState<{ [key: number]: number }>({})
  const [isPlaying, setIsPlaying] = useState<{ [key: number]: boolean }>({})
  const [showPlaybackControls, setShowPlaybackControls] = useState<{ [key: number]: boolean }>({})
  const [playbackSpeed, setPlaybackSpeed] = useState<{ [key: number]: number }>({})
  const [videoQuality, setVideoQuality] = useState<{ [key: number]: string }>({})
  const [showUI, setShowUI] = useState(true)
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [showSearchModal, setShowSearchModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareVideoId, setShareVideoId] = useState<number | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileTab, setProfileTab] = useState<"videos" | "liked" | "saved" | "settings">("videos")
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportTarget, setReportTarget] = useState<{
    type: "user" | "video"
    identifier: string | number
  } | null>(null)
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set())
  const [showMoreMenu, setShowMoreMenu] = useState<number | null>(null)
  const lastProgressUpdateRef = useRef<number>(0)

  // UI auto-hide timeout
  const resetUITimeout = useCallback(() => {
    setShowUI(true)
    if (uiTimeoutRef.current) {
      clearTimeout(uiTimeoutRef.current)
    }
    uiTimeoutRef.current = setTimeout(() => {
      setShowUI(false)
    }, 5000)
  }, [])

  useEffect(() => {
    setShowUI(true)
    const initialTimeout = setTimeout(() => {
      resetUITimeout()
    }, 2000)
    return () => {
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current)
      clearTimeout(initialTimeout)
      Object.values(doubleTapTimeoutRef.current).forEach((timeout) => clearTimeout(timeout))
      doubleTapTimeoutRef.current = {}
    }
  }, [resetUITimeout, doubleTapTimeoutRef])

  // Infinite scroll observer
  useEffect(() => {
    if (!loadingTriggerRef.current) return

    scrollObserverRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !isLoading && !isLoadingMoreRef.current && videos.length > 0) {
          loadMoreVideos()
        }
      },
      { threshold: 0.5 },
    )

    scrollObserverRef.current.observe(loadingTriggerRef.current)
    return () => scrollObserverRef.current?.disconnect()
  }, [isLoading, loadMoreVideos, videos.length, isLoadingMoreRef])

  // Video autoplay observer
  useEffect(() => {
    if (videoRefs.current.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          const videoId = Number(video.id) || Number(video.dataset.videoId)

          if (entry.isIntersecting) {
            if (videoId) {
              video.play().catch(() => {})
              setIsPlaying((prev) => ({ ...prev, [videoId]: true }))
            }
            // Preload the next video in the feed
            const currentIndex = videoRefs.current.indexOf(video)
            const nextVideo = videoRefs.current[currentIndex + 1]
            if (nextVideo && nextVideo.preload !== "auto") {
              nextVideo.preload = "auto"
            }
          } else {
            video.pause()
            if (videoId) {
              setIsPlaying((prev) => ({ ...prev, [videoId]: false }))
            }
          }
        })
      },
      { threshold: 0.5 },
    )

    videoRefs.current.forEach((video) => {
      if (video && observerRef.current) observerRef.current.observe(video)
    })

    return () => observerRef.current?.disconnect()
  }, [videos])

  // Video control handlers
  const toggleMute = () => {
    setIsMuted(!isMuted)
    videoRefs.current.forEach((video) => {
      if (video) video.muted = !isMuted
    })
  }

  const openShareModal = (videoId: number) => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    setShareVideoId(videoId)
    setShowShareModal(true)
  }

  const togglePlayPause = (videoId: number, index: number) => {
    const videoElement = videoRefs.current[index]
    if (videoElement) {
      if (videoElement.paused) {
        videoElement.play().catch(() => {})
        setIsPlaying((prev) => ({ ...prev, [videoId]: true }))
      } else {
        videoElement.pause()
        setIsPlaying((prev) => ({ ...prev, [videoId]: false }))
      }
    }
  }

  const changePlaybackSpeed = (videoId: number, index: number, speed: number) => {
    const videoElement = videoRefs.current[index]
    if (videoElement) {
      videoElement.playbackRate = speed
      setPlaybackSpeed((prev) => ({ ...prev, [videoId]: speed }))
    }
  }

  const seekVideo = (videoId: number, index: number, percentage: number) => {
    const videoElement = videoRefs.current[index]
    if (videoElement) {
      videoElement.currentTime = (percentage / 100) * videoElement.duration
    }
  }

  const displayedVideos =
    feedType === "following" ? videos.filter((video) => followedUsers.has(video.username)) : videos

  const handleVideoRef = (index: number, el: HTMLVideoElement | null) => {
    videoRefs.current[index] = el
    if (el) {
      const video = displayedVideos[index]
      if (video) {
        el.dataset.index = index.toString()
        el.dataset.videoId = video.id.toString()
        el.onloadedmetadata = () => {
          el.currentTime = 0
        }
        el.ontimeupdate = () => {
          const now = Date.now()
          if (now - lastProgressUpdateRef.current > 1000) {
            lastProgressUpdateRef.current = now
            const progress = (el.currentTime / el.duration) * 100
            setVideoProgress((prev) => ({ ...prev, [video.id]: progress }))
          }
        }
        el.onplay = () => setIsPlaying((prev) => ({ ...prev, [video.id]: true }))
        el.onpause = () => setIsPlaying((prev) => ({ ...prev, [video.id]: false }))
      }
    }
  }

  const handleLogout = async () => {
    try {
      const { api } = await import("@/lib/api/api")
      await api.logout()
    } catch {
      // Still proceed with local cleanup on error
    }
    setIsAuthenticated(false)
    setShowProfileModal(false)
    router.push("/login")
  }

  const openProfile = (username: string) => {
    setSelectedProfile(username)
    setProfileTab("videos")
    setShowProfileModal(true)
  }

  const openReportModal = (type: "user" | "video", identifier: string | number) => {
    setReportTarget({ type, identifier })
    setShowReportModal(true)
  }

  // TODO: Backend report endpoint not implemented yet. Once available, call
  // api.report(reportTarget.type, reportTarget.identifier, reason) here.
  const handleReport = (reason: string) => {
    if (!reportTarget) return
    toast.success("Report submitted", {
      description: "Thank you for helping keep our community safe.",
    })
    setShowReportModal(false)
    setReportTarget(null)
  }

  const handleBlockUser = async (username: string) => {
    try {
      await api.blockUser(username)
      setBlockedUsers((prev) => {
        const newSet = new Set(prev)
        newSet.add(username)
        return newSet
      })
      setShowProfileModal(false)
      toast.success(`Blocked ${username}`, {
        description: "You won't see their content anymore",
      })
    } catch (error) {
      console.error("Error blocking user:", error)
      toast.error("Failed to block user")
    }
  }

  const handleUnblockUser = async (username: string) => {
    try {
      await api.unblockUser(username)
      setBlockedUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(username)
        return newSet
      })
      toast.success(`Unblocked ${username}`, {
        description: "You can now see their content",
      })
    } catch (error) {
      console.error("Error unblocking user:", error)
      toast.error("Failed to unblock user")
    }
  }

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-black animate-fade-in"
      onMouseMove={resetUITimeout}
      onTouchStart={resetUITimeout}
      onClick={resetUITimeout}
    >
      {/* Header */}
      <VideoFeedHeader
        feedType={feedType}
        onFeedTypeChange={setFeedType}
        showUI={showUI}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onOpenSearch={() => setShowSearchModal(true)}
        videoProgress={videos.length > 0 ? videoProgress[videos[0]?.id] || 0 : 0}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        reportTarget={reportTarget}
        onClose={() => {
          setShowReportModal(false)
          setReportTarget(null)
        }}
        onReport={handleReport}
      />

      {/* Profile Modal */}
      {showProfileModal && selectedProfile && (
        <ProfileModalLoader
          selectedProfile={selectedProfile}
          currentUser={currentUser || ""}
          profileTab={profileTab}
          onTabChange={setProfileTab}
          isBlocked={blockedUsers.has(selectedProfile)}
          isFollowed={followedUsers.has(selectedProfile)}
          blockedUsers={blockedUsers}
          onClose={() => setShowProfileModal(false)}
          onReport={() => openReportModal("user", selectedProfile)}
          onBlock={() => handleBlockUser(selectedProfile)}
          onUnblock={handleUnblockUser}
          onFollow={(e) => toggleFollow(e, selectedProfile)}
          onEditProfile={() => {}}
          onOpenInbox={() => {
            setShowProfileModal(false)
            setShowNotifications(true)
          }}
          onOpenMessage={() => {
            setShowProfileModal(false)
            setShowNotifications(true)
            const existingConv = conversations.find((c) => c.username === selectedProfile)
            if (existingConv) {
              setSelectedConversation(existingConv.id)
            } else {
              setSelectedConversation("new-" + selectedProfile)
            }
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Video Container */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth scrollbar-hide"
        onTouchMove={resetUITimeout}
        onMouseMove={resetUITimeout}
        onClick={resetUITimeout}
        onScroll={() => {
          if (containerRef.current && videos.length > 0) {
            const scrollTop = containerRef.current.scrollTop
            videoCache.save(feedType, videos, scrollTop)
          }
        }}
      >
        {isLoading && videos.length === 0 ? (
          <div className="h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : displayedVideos.length === 0 ? (
          <div className="h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-white text-lg mb-2">No videos found</p>
              <p className="text-white/60 text-sm mb-4">
                {feedType === "following"
                  ? "Follow creators to see their videos here"
                  : "No videos available at the moment"}
              </p>
              {feedType === "following" && (
                <button
                  onClick={() => setFeedType("foryou")}
                  className="px-4 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors"
                >
                  Switch to For You
                </button>
              )}
            </div>
          </div>
        ) : (
          displayedVideos.map((video, index) => (
            <VideoItemInline
              key={`${video.id}-${index}`}
              video={video}
              index={index}
              videoRefs={videoRefs}
              isMuted={isMuted}
              isPlaying={isPlaying}
              videoProgress={videoProgress}
              doubleTapHearts={doubleTapHearts}
              showPlaybackControls={showPlaybackControls}
              playbackSpeed={playbackSpeed}
              videoQuality={videoQuality}
              showUI={showUI}
              likedVideos={likedVideos}
              savedVideos={savedVideos}
              followedUsers={followedUsers}
              showMoreMenu={showMoreMenu}
              currentUser={currentUser || ""}
              onVideoRef={handleVideoRef}
              onDoubleTap={handleDoubleTap}
              onToggleLike={toggleLike}
              onOpenComments={openComments}
              onToggleSave={toggleSave}
              onOpenShareModal={openShareModal}
              onSetReportTarget={setReportTarget}
              onShowReportModal={setShowReportModal}
              onSetShowMoreMenu={setShowMoreMenu}
              onRequireAuth={requireAuth}
              onOpenProfile={openProfile}
              onToggleFollow={toggleFollow}
              onTogglePlayPause={togglePlayPause}
              onChangePlaybackSpeed={changePlaybackSpeed}
              onSeekVideo={seekVideo}
              onSetVideoProgress={setVideoProgress}
              onSetIsPlaying={setIsPlaying}
              onSetVideoQuality={setVideoQuality}
              onSetShowPlaybackControls={setShowPlaybackControls}
            />
          ))
        )}

        {/* Loading indicator */}
        <div ref={loadingTriggerRef} className="h-20 flex items-center justify-center">
          {isLoading && (
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onProfileSelect={(username) => {
          setSelectedProfile(username)
          setShowProfileModal(true)
          setShowSearchModal(false)
        }}
      />

      {/* Comments Modal */}
      <CommentModal
        isOpen={showComments}
        onClose={closeComments}
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
      <ShareModal
        isOpen={showShareModal}
        videoId={shareVideoId}
        onClose={() => {
          setShowShareModal(false)
          setShareVideoId(null)
        }}
      />

      {/* Notification & Inbox Modal */}
      <NotificationModal
        isOpen={showNotifications}
        notifications={notifications}
        conversations={conversations}
        messages={messages}
        selectedConversation={selectedConversation}
        messageInput={messageInput}
        onClose={() => {
          setShowNotifications(false)
          setSelectedConversation(null)
        }}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onSelectConversation={setSelectedConversation}
        onMessageInputChange={setMessageInput}
        onSendMessage={sendMessage}
      />

      {/* Bottom Navigation */}
      <BottomNavigation
        currentPage="home"
        onNavigate={(page) => {
          if (page === "profile") {
            if (currentUser) {
              setSelectedProfile(currentUser)
              setShowProfileModal(true)
            }
          } else {
            startTransition(() => {
              router.push(page)
            })
          }
        }}
        isAuthenticated={isAuthenticated}
        unreadCount={unreadCount}
        onNotificationClick={() => setShowNotifications(true)}
      />
    </div>
  )
}
